import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { FileEntity } from '../../files/entities/file.entity.js';

@Entity('share_links')
@Index(['token', 'isActive'])
export class ShareLinkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'file_id' })
  fileId: number;

  @ManyToOne(() => FileEntity, (file) => file.shareLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: Relation<FileEntity>;

  @Index({ unique: true })
  @Column({ unique: true })
  token: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
