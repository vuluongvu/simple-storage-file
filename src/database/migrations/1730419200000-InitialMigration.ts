import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialMigration1730419200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'password', type: 'varchar', length: '255', isNullable: false },
          { name: 'full_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'username', type: 'varchar', length: '255', isUnique: true, isNullable: true },
          { name: 'role', type: 'enum', enum: ['USER', 'ADMIN'], default: "'USER'" },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    // 2. files table
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'original_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'storage_key', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'mime_type', type: 'varchar', length: '120', isNullable: false },
          { name: 'size', type: 'bigint', isNullable: false },
          { name: 'visibility', type: 'enum', enum: ['PRIVATE', 'SHARED', 'PUBLIC'], default: "'PRIVATE'" },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex('files', new TableIndex({ name: 'IDX_files_user_id', columnNames: ['user_id'] }));
    await queryRunner.createIndex('files', new TableIndex({ name: 'IDX_files_original_name', columnNames: ['original_name'] }));
    await queryRunner.createIndex('files', new TableIndex({ name: 'IDX_files_user_created', columnNames: ['user_id', 'created_at'] }));

    // 3. file_shares table
    await queryRunner.createTable(
      new Table({
        name: 'file_shares',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'file_id', type: 'int', isNullable: false },
          { name: 'shared_with_user_id', type: 'int', isNullable: false },
          { name: 'permission', type: 'enum', enum: ['VIEW', 'DOWNLOAD'], default: "'VIEW'" },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'file_shares',
      new TableForeignKey({
        columnNames: ['file_id'],
        referencedTableName: 'files',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_shares',
      new TableForeignKey({
        columnNames: ['shared_with_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'file_shares',
      new TableIndex({
        name: 'UQ_file_shares_file_user',
        columnNames: ['file_id', 'shared_with_user_id'],
        isUnique: true,
      }),
    );

    // 4. share_links table
    await queryRunner.createTable(
      new Table({
        name: 'share_links',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'file_id', type: 'int', isNullable: false },
          { name: 'token', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'is_active', type: 'tinyint', default: 1, isNullable: false },
          { name: 'expires_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'share_links',
      new TableForeignKey({
        columnNames: ['file_id'],
        referencedTableName: 'files',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'share_links',
      new TableIndex({ name: 'IDX_share_links_token_active', columnNames: ['token', 'is_active'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('share_links');
    await queryRunner.dropTable('file_shares');
    await queryRunner.dropTable('files');
    await queryRunner.dropTable('users');
  }
}
