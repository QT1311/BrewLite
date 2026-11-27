import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FR-18, FR-25: khuyến mãi, điểm thưởng và đổi điểm.
 * Chỉ thêm bảng/cột mới (có giá trị mặc định) nên tương thích ngược với dữ liệu production hiện có.
 */
export class AddPromotionsAndLoyalty1794900000000 implements MigrationInterface {
  name = 'AddPromotionsAndLoyalty1794900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS "promotions" (
      "id" SERIAL NOT NULL,
      "code" character varying(30) NOT NULL,
      "description" character varying(200) NOT NULL DEFAULT '',
      "discount_type" character varying(10) NOT NULL,
      "value" integer NOT NULL,
      "min_order_total" integer NOT NULL DEFAULT 0,
      "max_discount" integer,
      "max_uses" integer,
      "used_count" integer NOT NULL DEFAULT 0,
      "expires_at" TIMESTAMP WITH TIME ZONE,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_promotions_id" PRIMARY KEY ("id")
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promotions_code" ON "promotions" ("code")`);

    await q.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points" integer NOT NULL DEFAULT 0`);

    await q.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promotion_id" integer`);
    await q.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promotion_code" character varying(30)`);
    await q.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" integer NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "points_redeemed" integer NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "points_discount" integer NOT NULL DEFAULT 0`);
    await q.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_orders_promotion') THEN
        ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL;
      END IF;
    END $$`);

    await q.query(`CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
      "id" SERIAL NOT NULL,
      "user_id" integer NOT NULL,
      "order_id" integer NOT NULL,
      "type" character varying(10) NOT NULL DEFAULT 'EARN',
      "points" integer NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_loyalty_transactions_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_loyalty_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_loyalty_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_user" ON "loyalty_transactions" ("user_id")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_order_type" ON "loyalty_transactions" ("order_id", "type") WHERE "type" = 'EARN'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "loyalty_transactions"`);
    await q.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_promotion"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "points_discount"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "points_redeemed"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "discount_amount"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "promotion_code"`);
    await q.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "promotion_id"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "loyalty_points"`);
    await q.query(`DROP TABLE IF EXISTS "promotions"`);
  }
}
