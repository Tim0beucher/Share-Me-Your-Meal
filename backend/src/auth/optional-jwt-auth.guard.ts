import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../db/types';
import { AuthenticatedRequest } from './jwt-auth.guard';

// Comme JwtAuthGuard, mais ne bloque jamais la requête : un jeton absent ou
// invalide fait simplement continuer en anonyme. Utile pour les routes
// publiques (ex. fiche recette) qui doivent quand même savoir "qui" consulte
// pour distinguer l'auteur d'une recette privée d'un visiteur.
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; role: UserRole }>(token);
        request.userId = payload.sub;
        request.userRole = payload.role;
      } catch {
        // jeton invalide : on continue en anonyme plutôt que de rejeter la requête
      }
    }
    return true;
  }
}
