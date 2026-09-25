import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never rejects: attaches the authenticated user when a
 * valid Bearer token is present and continues anonymously otherwise. Used by
 * public catalog/schedule endpoints that redact contact details (phones,
 * emails) for anonymous callers while serving full data to signed-in users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Invalid/expired tokens degrade to anonymous access on public routes.
    }
    return true;
  }

  handleRequest(_err: any, user: any): any {
    return user || null;
  }
}
