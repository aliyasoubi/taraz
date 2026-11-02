import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { InvalidInputError } from '../../common/errors';
import type { AppConfig } from '../../config/configuration';
import { User } from './user.entity';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
}

interface TokenPayload {
  sub: string;
}

// Compared against when the username is unknown, so a wrong name and a wrong
// password take the same time.
const DUMMY_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7U3hJ6Dkv1eO2cVb3uJ1oZJ9n8iJd3S';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<SessionUser | null> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('lower(u.username) = lower(:username)', {
        username: username.trim(),
      })
      .getOne();
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    return user && ok ? toSession(user) : null;
  }

  issueToken(user: SessionUser): string {
    return this.jwt.sign({ sub: user.id } satisfies TokenPayload, {
      expiresIn: `${this.sessionDays()}d`,
    });
  }

  sessionDays(): number {
    return this.config.get<AppConfig['auth']>('auth')!.sessionDays;
  }

  async verify(token: string): Promise<SessionUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      const user = await this.users.findOneBy({ id: payload.sub });
      return user ? toSession(user) : null;
    } catch {
      return null;
    }
  }

  async changePassword(
    userId: string,
    current: string,
    next: string,
  ): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :userId', { userId })
      .getOneOrFail();
    if (!(await bcrypt.compare(current, user.passwordHash))) {
      throw new InvalidInputError('wrong_password');
    }
    await this.users.update(userId, { passwordHash: await hashPassword(next) });
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function toSession(user: User): SessionUser {
  return { id: user.id, username: user.username, fullName: user.fullName };
}
