import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { OrderStatus } from '../orders/order-status';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';
import { CreateStaffDto, UpdateProductDto } from './dto/admin.dto';

const VN_TZ = 'Asia/Ho_Chi_Minh';

export interface RevenueReport {
  days: number;
  totalRevenue: number;
  orderCount: number;
  averageOrder: number;
  today: { revenue: number; orders: number };
  byDay: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
}

export interface StaffAccount {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam, lùi `back` ngày so với hôm nay. */
function vnDate(back: number): string {
  const d = new Date(Date.now() - back * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(d);
}

@Injectable()
export class AdminService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /**
   * Doanh thu = tổng các giao dịch thanh toán thành công, nhóm theo ngày giờ Việt Nam.
   * Đơn chưa thanh toán, thanh toán lỗi hoặc đã huỷ không được tính.
   */
  async revenue(days = 7): Promise<RevenueReport> {
    const sinceSql = `(date_trunc('day', now() AT TIME ZONE '${VN_TZ}') - make_interval(days => $1)) AT TIME ZONE '${VN_TZ}'`;
    const rows: Array<{ day: string; revenue: number; orders: number }> = await this.db.query(
      `SELECT to_char(p.created_at AT TIME ZONE '${VN_TZ}', 'YYYY-MM-DD') AS day,
              SUM(p.amount)::int AS revenue, COUNT(DISTINCT p.order_id)::int AS orders
         FROM payments p
        WHERE p.status = 'SUCCEEDED' AND p.created_at >= ${sinceSql}
        GROUP BY 1 ORDER BY 1`,
      [days - 1],
    );
    const map = new Map(rows.map((r) => [r.day, r]));
    const byDay = Array.from({ length: days }, (_, i) => {
      const date = vnDate(days - 1 - i);
      const r = map.get(date);
      return { date, revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 };
    });
    const totalRevenue = byDay.reduce((s, d) => s + d.revenue, 0);
    const orderCount = byDay.reduce((s, d) => s + d.orders, 0);

    const top: Array<{ name: string; quantity: number; revenue: number }> = await this.db.query(
      `SELECT oi.name AS name, SUM(oi.quantity)::int AS quantity, SUM(oi.quantity * oi.unit_price)::int AS revenue
         FROM order_items oi
         JOIN payments p ON p.order_id = oi.order_id AND p.status = 'SUCCEEDED'
        WHERE p.created_at >= ${sinceSql}
        GROUP BY oi.name ORDER BY quantity DESC, revenue DESC LIMIT 5`,
      [days - 1],
    );
    const statusRows: Array<{ status: string; count: number }> = await this.db.query(
      `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`,
    );
    const ordersByStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
    const today = byDay[byDay.length - 1];

    return {
      days,
      totalRevenue,
      orderCount,
      averageOrder: orderCount ? Math.round(totalRevenue / orderCount) : 0,
      today: { revenue: today.revenue, orders: today.orders },
      byDay,
      topProducts: top,
      ordersByStatus,
    };
  }

  listProducts(): Promise<Product[]> {
    return this.db.getRepository(Product).find({ order: { id: 'ASC' } });
  }

  /** Đặt tồn kho tuyệt đối và/hoặc bật tắt bán. Tăng `version` để giao dịch đặt đơn đang chạy phải đọc lại. */
  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    const repo = this.db.getRepository(Product);
    if (!(await repo.findOne({ where: { id } }))) throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    const set: Record<string, unknown> = {};
    if (dto.stock !== undefined) set.stock = dto.stock;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;
    if (Object.keys(set).length) {
      await repo
        .createQueryBuilder()
        .update(Product)
        .set({ ...set, version: () => 'version + 1' })
        .where('id = :id', { id })
        .execute();
    }
    return (await repo.findOne({ where: { id } }))!;
  }

  async listStaff(): Promise<StaffAccount[]> {
    const users = await this.db.getRepository(User).find({ where: { role: UserRole.STAFF }, order: { id: 'ASC' } });
    return users.map(toStaffAccount);
  }

  async createStaff(dto: CreateStaffDto): Promise<StaffAccount> {
    const repo = this.db.getRepository(User);
    const email = dto.email.trim().toLowerCase();
    if (await repo.findOne({ where: { email } })) throw new ConflictException('Email này đã được sử dụng');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await repo.save(
      repo.create({ email, name: dto.name.trim(), passwordHash, role: UserRole.STAFF, isActive: true }),
    );
    return toStaffAccount(user);
  }

  /** Chỉ sửa được tài khoản staff; không đụng tới admin hay khách hàng. */
  async setStaffActive(id: number, isActive: boolean): Promise<StaffAccount> {
    const repo = this.db.getRepository(User);
    const user = await repo.findOne({ where: { id, role: UserRole.STAFF } });
    if (!user) throw new NotFoundException(`Không tìm thấy nhân viên #${id}`);
    user.isActive = isActive;
    return toStaffAccount(await repo.save(user));
  }
}

function toStaffAccount(u: User): StaffAccount {
  return { id: u.id, email: u.email, name: u.name, isActive: u.isActive, createdAt: u.createdAt };
}

export const STATUS_VALUES = Object.values(OrderStatus);
