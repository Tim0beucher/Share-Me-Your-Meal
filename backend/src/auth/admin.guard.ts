import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { AuthenticatedRequest } from './jwt-auth.guard';

// À utiliser après JwtAuthGuard (@UseGuards(JwtAuthGuard, AdminGuard)). Lit
// le rôle en base plutôt que de faire confiance au rôle embarqué dans le
// JWT : un utilisateur promu admin directement en base n'a pas besoin de se
// reconnecter pour que ça prenne effet immédiatement.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.db.selectFrom('users').select('role').where('id', '=', request.userId!).executeTakeFirst();
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Réservé aux administrateurs.');
    }
    return true;
  }
}
