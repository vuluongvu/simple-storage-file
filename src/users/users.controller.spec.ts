import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const mockUsersService = {
      findById: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com', fullName: 'Updated' }),
      searchByEmail: vi.fn().mockResolvedValue([{ id: 1, email: 'test@example.com' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getProfile should return current user', async () => {
    const user = { userId: 1, email: 'test@example.com', role: 'USER' };
    const result = await controller.getProfile(user);
    expect(result).toEqual({ id: 1, email: 'test@example.com' });
    expect(service.findById).toHaveBeenCalledWith(1);
  });

  it('updateProfile should update user', async () => {
    const user = { userId: 1, email: 'test@example.com', role: 'USER' };
    const result = await controller.updateProfile(user, { fullName: 'Updated' });
    expect(result.fullName).toBe('Updated');
    expect(service.update).toHaveBeenCalledWith(1, { fullName: 'Updated' });
  });

  it('searchByEmail should return search results', async () => {
    const result = await controller.searchByEmail({ email: 'test' });
    expect(result).toHaveLength(1);
    expect(service.searchByEmail).toHaveBeenCalledWith('test');
  });
});
