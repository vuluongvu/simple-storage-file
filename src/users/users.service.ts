import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { hashPassword } from '../common/utils/hash.util.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: RegisterDto): Promise<User> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: dto.fullName?.trim(),
      username: normalizedEmail,
    });

    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository.findOne({ where: { email: normalizedEmail } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  async update(userId: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }

    return this.userRepository.save(user);
  }

  async searchByEmail(queryEmail: string): Promise<User[]> {
    const normalized = queryEmail.trim().toLowerCase();
    const users = await this.userRepository.find({
      where: { email: Like(`%${normalized}%`) },
      select: { id: true, email: true, fullName: true, createdAt: true },
      take: 20,
    });
    return users;
  }
}
