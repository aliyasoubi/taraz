import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService, SessionUser } from './auth.service';

export const SESSION_COOKIE = 'taraz_session';

const IS_PUBLIC = 'isPublic';

/** Opens a route to callers without a session (sign-in, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

type AuthedRequest = Request & { user?: SessionUser };

/**
 * Every route needs a session unless marked `@Public()`. The session is a JWT
 * in an httpOnly cookie, so no script on the page can read it; a bearer header
 * is accepted too, for tools that call the API directly.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookies = req.cookies as Record<string, string> | undefined;
    const header = req.headers.authorization;
    const token =
      cookies?.[SESSION_COOKIE] ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    const user = token ? await this.auth.verify(token) : null;
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): SessionUser =>
    context.switchToHttp().getRequest<AuthedRequest>().user!,
);
