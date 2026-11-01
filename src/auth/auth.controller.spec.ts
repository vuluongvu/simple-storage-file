import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      register: vi.fn().mockResolvedValue({
        accessToken: 'token123',
        user: { id: 1, email: 'test@example.com' },
      }),
      login: vi.fn().mockResolvedValue({
        accessToken: 'token123',
        user: { id: 1, email: 'test@example.com' },
      }),
      getProfile: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should call authService.register', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.register(dto);
    expect(result).toHaveProperty('accessToken', 'token123');
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('login should call authService.login', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.login(dto);
    expect(result).toHaveProperty('accessToken', 'token123');
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('getProfile should return current user profile', async () => {
    const user = { userId: 1, email: 'test@example.com', role: 'USER' };
    const result = await controller.getProfile(user);
    expect(result).toEqual({ id: 1, email: 'test@example.com' });
    expect(service.getProfile).toHaveBeenCalledWith(1);
  });
});
