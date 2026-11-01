import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { FileEntity } from '../../files/entities/file.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { SharePermission } from '../../common/enums/share-permission.enum.js';

@Entity('file_shares')
@Unique(['fileId', 'sharedWithUserId'])
export class FileShareEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'file_id' })
  fileId: number;

  @ManyToOne(() => FileEntity, (file) => file.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: Relation<FileEntity>;

  @Index()
  @Column({ name: 'shared_with_user_id' })
  sharedWithUserId: number;

  @ManyToOne(() => User, (user) => user.fileShares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWithUser: Relation<User>;

  @Column({
    type: 'enum',
    enum: SharePermission,
    default: SharePermission.VIEW,
  })
  permission: SharePermission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
