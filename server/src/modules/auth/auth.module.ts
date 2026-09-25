import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OpenWaModule } from '../openwa/openwa.module';
import { resolveJwtSecret, accessTokenTtlSeconds } from '../../common/security.util';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // Throws at boot in production when JWT_SECRET is missing/weak —
      // the API must never sign tokens with a publicly-known fallback key.
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: accessTokenTtlSeconds() },
    }),
    OpenWaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}

