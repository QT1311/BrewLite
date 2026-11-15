import { MigrationInterface, QueryRunner } from 'typeorm';

/** Thêm vai trò/khoá tài khoản cho users và cờ ngưng bán cho products. Chỉ thêm cột có giá trị mặc định (tương thích ngược). */
export class AddRolesAndProductActive1794800000000 implements MigrationInterface {
  name = 'AddRolesAndProductActive1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(10) NOT NULL DEFAULT 'customer'`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
  }
}
