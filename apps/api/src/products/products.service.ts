import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Product } from './product.entity';
import { CATEGORY_ARCHIVED, SEED_PRODUCTS } from './seed-data';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  /**
   * Đồng bộ menu mẫu theo tên món: thêm món mới, cập nhật giá/ảnh/size của món đã có (giữ nguyên tồn kho),
   * còn món cũ không còn trong menu được chuyển sang "archived" (không hiện, nhưng đơn cũ vẫn tham chiếu được).
   */
  async onModuleInit() {
    const existing = await this.repo.find();
    const byName = new Map(existing.map((p) => [p.name, p]));
    const seedNames = new Set(SEED_PRODUCTS.map((p) => p.name));
    const toSave = SEED_PRODUCTS.map((seed) => {
      const cur = byName.get(seed.name);
      return cur ? this.repo.create({ ...cur, ...seed, stock: cur.stock }) : this.repo.create(seed);
    });
    for (const p of existing) {
      if (!seedNames.has(p.name) && p.category !== CATEGORY_ARCHIVED && p.category !== 'test') {
        toSave.push(this.repo.create({ ...p, category: CATEGORY_ARCHIVED }));
      }
    }
    if (toSave.length) await this.repo.save(toSave);
  }

  findAll(): Promise<Product[]> {
    return this.repo.find({ where: { category: Not(CATEGORY_ARCHIVED), isActive: true }, order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
    }
    return product;
  }
}
