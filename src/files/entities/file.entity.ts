import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { FileVisibility } from '../../common/enums/file-visibility.enum.js';
import { FileShareEntity } from '../../file-shares/entities/file-share.entity.js';
import { ShareLinkEntity } from '../../share-links/entities/share-link.entity.js';

@Entity('files')
@Index(['userId', 'createdAt'])
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Index()
  @Column({ name: 'original_name' })
  originalName: string;

  @Index({ unique: true })
  @Column({ name: 'storage_key', unique: true })
  storageKey: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  size: number;

  @Index()
  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
  })
  visibility: FileVisibility;

  @OneToMany(() => FileShareEntity, (share) => share.file)
  shares: Relation<FileShareEntity[]>;

  @OneToMany(() => ShareLinkEntity, (link) => link.file)
  shareLinks: Relation<ShareLinkEntity[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
