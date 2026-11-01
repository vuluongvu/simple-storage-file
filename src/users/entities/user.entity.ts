import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { Exclude } from 'class-transformer';
import { FileEntity } from '../../files/entities/file.entity.js';
import { FileShareEntity } from '../../file-shares/entities/file-share.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Column({ name: 'full_name', nullable: true })
  fullName?: string;

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @OneToMany(() => FileEntity, (file) => file.user)
  files: Relation<FileEntity[]>;

  @OneToMany(() => FileShareEntity, (share) => share.sharedWithUser)
  fileShares: Relation<FileShareEntity[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
