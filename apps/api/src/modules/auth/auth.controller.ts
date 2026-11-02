import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';

import { InvalidInputError } from '../../common/errors';
import type { AppConfig } from '../../config/configuration';
import { CurrentUser, Public, SESSION_COOKIE } from './auth.guard';
import { AuthService, SessionUser } from './auth.service';

class LoginDto {
  @IsString()
  @MaxLength(60)
  username: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const user = await this.auth.login(dto.username, dto.password);
    if (!user) throw new InvalidInputError('invalid_credentials');
    res.cookie(SESSION_COOKIE, this.auth.issueToken(user), {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get<AppConfig['auth']>('auth')!.cookieSecure,
      path: '/api',
      maxAge: this.auth.sessionDays() * 24 * 60 * 60 * 1000,
    });
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/api' });
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Post('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: SessionUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
