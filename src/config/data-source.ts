import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity.js';
import { FileEntity } from '../files/entities/file.entity.js';
import { FileShareEntity } from '../file-shares/entities/file-share.entity.js';
import { ShareLinkEntity } from '../share-links/entities/share-link.entity.js';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'storage_online',
  entities: [User, FileEntity, FileShareEntity, ShareLinkEntity],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
