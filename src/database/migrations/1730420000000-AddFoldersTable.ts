import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddFoldersTable1730420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create folders table
    await queryRunner.createTable(
      new Table({
        name: 'folders',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'parent_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'folders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'folders',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'folders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex('folders', new TableIndex({ name: 'IDX_folders_user_id', columnNames: ['user_id'] }));
    await queryRunner.createIndex('folders', new TableIndex({ name: 'IDX_folders_parent_id', columnNames: ['parent_id'] }));

    // 2. Add folder_id column to files table
    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'folder_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['folder_id'],
        referencedTableName: 'folders',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex('files', new TableIndex({ name: 'IDX_files_folder_id', columnNames: ['folder_id'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove folder_id from files
    const filesTable = await queryRunner.getTable('files');
    if (filesTable) {
      const foreignKey = filesTable.foreignKeys.find((fk) => fk.columnNames.indexOf('folder_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('files', foreignKey);
      }
      await queryRunner.dropIndex('files', 'IDX_files_folder_id');
      await queryRunner.dropColumn('files', 'folder_id');
    }

    // 2. Drop folders table
    await queryRunner.dropTable('folders');
  }
}
