import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole } from '../db/types';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Authentification requise.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: UserRole }>(token);
      request.userId = payload.sub;
      request.userRole = payload.role;
      return true;
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
  }
}
