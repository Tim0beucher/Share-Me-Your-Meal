import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database, UserRole } from '../db/types';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; pseudo: string; role: UserRole };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where((eb) => eb.or([eb('email', '=', dto.email), eb('pseudo', '=', dto.pseudo)]))
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException('Cet e-mail ou ce pseudo est déjà utilisé.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.db
      .insertInto('users')
      .values({
        email: dto.email,
        pseudo: dto.pseudo,
        password_hash: passwordHash,
        auth_provider: 'email',
      })
      .returning(['id', 'email', 'pseudo', 'role'])
      .executeTakeFirstOrThrow();

    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'pseudo', 'role', 'password_hash'])
      .where('email', '=', dto.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!user || !user.password_hash || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect.');
    }

    return this.buildResult({ id: user.id, email: user.email, pseudo: user.pseudo, role: user.role });
  }

  private buildResult(user: { id: string; email: string; pseudo: string; role: UserRole }): AuthResult {
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
      user,
    };
  }

  // Répond toujours de façon identique côté appelant, qu'un compte existe ou
  // non pour cet e-mail : sinon on révèle quels e-mails sont inscrits.
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'pseudo'])
      .where('email', '=', dto.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.db
      .insertInto('password_reset_tokens')
      .values({ user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS) })
      .execute();

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const link = `${frontendUrl.replace(/\/$/, '')}/reinitialiser-mot-de-passe?token=${rawToken}`;

    await this.mail.send(
      dto.email,
      'Réinitialisation de votre mot de passe',
      `<p>Bonjour ${user.pseudo},</p>
       <p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p>
       <p><a href="${link}">${link}</a></p>
       <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>`,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.db
      .selectFrom('password_reset_tokens')
      .select(['id', 'user_id', 'expires_at', 'used_at'])
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();

    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
      throw new BadRequestException('Ce lien de réinitialisation est invalide ou a expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.db.updateTable('users').set({ password_hash: passwordHash }).where('id', '=', record.user_id).execute();
    await this.db.updateTable('password_reset_tokens').set({ used_at: new Date() }).where('id', '=', record.id).execute();
  }
}
