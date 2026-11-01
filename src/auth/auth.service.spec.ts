import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import * as hashUtil from '../common/utils/hash.util.js';
import { Role } from '../common/enums/role.enum.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersService = {
      create: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      findById: vi.fn(),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt_token_sample'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a user and return access token', async () => {
      mockUsersService.create.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(result).toHaveProperty('accessToken', 'jwt_token_sample');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
      });
      vi.spyOn(hashUtil, 'comparePassword').mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token on successful login', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: Role.USER,
        createdAt: new Date(),
      });
      vi.spyOn(hashUtil, 'comparePassword').mockResolvedValueOnce(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct_password',
      });

      expect(result).toHaveProperty('accessToken', 'jwt_token_sample');
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
