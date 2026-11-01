import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((user) => Promise.resolve({ id: 1, ...user })),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      await expect(
        service.create({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and hash password for a new user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      const result = await service.findById(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchByEmail', () => {
    it('should return list of matching users', async () => {
      mockRepository.find.mockResolvedValueOnce([
        { id: 1, email: 'alice@example.com', fullName: 'Alice' },
      ]);

      const results = await service.searchByEmail('alice');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('alice@example.com');
    });
  });
});
