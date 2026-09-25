import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveJwtSecret } from '../../common/security.util';

export interface RequestUser {
  id: string;
  role: string;
  type?: string;
  familyId?: string;
  studentId?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    role?: string;
    type?: string;
    familyId?: string;
    studentId?: string;
    mustChangePassword?: boolean;
  }): Promise<RequestUser> {
    // First-login "temporary" tokens are single-purpose: they may only be
    // exchanged via the public first-time-setup endpoint (which verifies the
    // temporary password itself). They must never authorize API access.
    if (payload.mustChangePassword) {
      throw new UnauthorizedException(
        'Temporary setup token cannot access the API. Complete first-time setup first.',
      );
    }

    if (payload.type === 'family' || payload.familyId) {
      const family = await this.prisma.family.findUnique({
        where: { id: payload.familyId || payload.sub },
      });
      if (!family) {
        throw new UnauthorizedException('Family session expired or account not found');
      }
      return {
        id: family.id,
        familyId: family.id,
        parentName: family.parentName,
        role: 'family',
        type: 'family',
      };
    }

    if (payload.type === 'student' || payload.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: payload.studentId || payload.sub },
        select: { id: true, name: true, familyId: true, barcode: true },
      });
      if (!student) {
        throw new UnauthorizedException('Student session expired or account not found');
      }
      return {
        id: student.id,
        studentId: student.id,
        familyId: student.familyId,
        name: student.name,
        barcode: student.barcode,
        role: 'student',
        type: 'student',
      };
    }

    const user = await this.prisma.staffUser.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists or session expired');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser as RequestUser;
  }
}
