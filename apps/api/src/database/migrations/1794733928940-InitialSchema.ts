import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794733928940 implements MigrationInterface {
    name = 'InitialSchema1794733928940'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Baseline: CSDL phát triển cũ được tạo bằng `synchronize` đã có sẵn schema này → chỉ ghi nhận migration, không tạo lại.
        if (await queryRunner.hasTable('users')) return;
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "description" text NOT NULL DEFAULT '', "price" integer NOT NULL, "sizePrices" jsonb, "allowToppings" boolean NOT NULL DEFAULT false, "imageUrl" character varying, "category" character varying(40) NOT NULL DEFAULT 'ca-phe', "stock" integer NOT NULL DEFAULT '0', "version" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "product_id" integer NOT NULL, "name" character varying(120) NOT NULL, "size" character varying(1), "toppings" jsonb NOT NULL DEFAULT '[]', "unit_price" integer NOT NULL, "quantity" integer NOT NULL, "order_id" integer, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "total" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a922b820eeef29ac1c6800e826" ON "orders" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" SERIAL NOT NULL, "idempotency_key" character varying(100) NOT NULL, "order_id" integer NOT NULL, "user_id" integer NOT NULL, "method" character varying(10) NOT NULL, "amount" integer NOT NULL, "status" character varying(10) NOT NULL, "transaction_ref" character varying(64), "failure_reason" character varying(200), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_59dcef70bd19850783c84f840e" ON "payments" ("idempotency_key") `);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59dcef70bd19850783c84f840e"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a922b820eeef29ac1c6800e826"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
