import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database, UserRole } from '../db/types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; pseudo: string; role: UserRole };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly jwt: JwtService,
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
}
