import { ConflictException, Injectable, NotFoundException, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { checkEligibility, computeDiscount, normalizeCode } from './promotion';
import { DiscountType, Promotion } from './promotion.entity';

/** Mã mẫu để demo; chỉ tạo khi chưa tồn tại (không ghi đè chỉnh sửa của admin). */
const SEED_PROMOTIONS: Array<Partial<Promotion>> = [
  { code: 'BREW10', description: 'Giảm 10% (tối đa 20.000đ)', discountType: DiscountType.PERCENT, value: 10, maxDiscount: 20000, minOrderTotal: 0 },
  { code: 'GIAM15K', description: 'Giảm 15.000đ cho đơn từ 60.000đ', discountType: DiscountType.FIXED, value: 15000, minOrderTotal: 60000 },
];

export interface PromotionInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minOrderTotal?: number;
  maxDiscount?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface PromotionPatch {
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
}

@Injectable()
export class PromotionsService implements OnModuleInit {
  constructor(@InjectRepository(Promotion) private readonly repo: Repository<Promotion>) {}

  async onModuleInit() {
    for (const seed of SEED_PROMOTIONS) {
      if (!(await this.repo.findOne({ where: { code: seed.code } }))) await this.repo.save(this.repo.create(seed));
    }
  }

  /**
   * Kiểm tra mã rồi GIỮ một lượt dùng trong transaction của đơn hàng.
   * Việc tăng used_count là UPDATE có điều kiện nên khi nhiều đơn dùng cùng lúc, chỉ đúng `maxUses` đơn thành công.
   */
  async reserve(m: EntityManager, rawCode: string, subtotal: number): Promise<{ promotion: Promotion; discount: number }> {
    const promotion = await m.findOne(Promotion, { where: { code: normalizeCode(rawCode) } });
    if (!promotion) throw new UnprocessableEntityException('Mã khuyến mãi không tồn tại');
    const problem = checkEligibility(promotion, subtotal);
    if (problem) throw new UnprocessableEntityException(problem);

    const res = await m
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => 'used_count + 1' })
      .where(
        'id = :id AND is_active = true AND (max_uses IS NULL OR used_count < max_uses) AND (expires_at IS NULL OR expires_at > now())',
        { id: promotion.id },
      )
      .execute();
    if (res.affected !== 1) throw new UnprocessableEntityException('Mã khuyến mãi đã hết lượt sử dụng');
    return { promotion, discount: computeDiscount(promotion, subtotal) };
  }

  /** Trả lại lượt dùng khi đơn bị huỷ hoặc khách gỡ/đổi mã. */
  async release(m: EntityManager, promotionId: number | null | undefined): Promise<void> {
    if (promotionId == null) return;
    await m
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => 'GREATEST(used_count - 1, 0)' })
      .where('id = :id', { id: promotionId })
      .execute();
  }

  list(): Promise<Promotion[]> {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  async create(input: PromotionInput): Promise<Promotion> {
    const code = normalizeCode(input.code);
    if (await this.repo.findOne({ where: { code } })) throw new ConflictException('Mã khuyến mãi đã tồn tại');
    return this.repo.save(
      this.repo.create({
        code,
        description: input.description?.trim() ?? '',
        discountType: input.discountType,
        value: input.value,
        minOrderTotal: input.minOrderTotal ?? 0,
        maxDiscount: input.discountType === DiscountType.PERCENT ? input.maxDiscount ?? null : null,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      }),
    );
  }

  async update(id: number, patch: PromotionPatch): Promise<Promotion> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
    if (patch.isActive !== undefined) p.isActive = patch.isActive;
    if (patch.maxUses !== undefined) p.maxUses = patch.maxUses;
    if (patch.expiresAt !== undefined) p.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
    return this.repo.save(p);
  }
}
