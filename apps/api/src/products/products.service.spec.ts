import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { SEED_PRODUCTS } from './seed-data';

describe('ProductsService', () => {
  let service: ProductsService;
  const repo = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((p) => p),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('findAll trả về danh sách sản phẩm sắp theo id', async () => {
    repo.find.mockResolvedValue([{ id: 1, name: 'Cà phê sữa' }]);
    await expect(service.findAll()).resolves.toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ order: { id: 'ASC' } }));
  });

  it('findOne trả về sản phẩm khi tồn tại', async () => {
    repo.findOne.mockResolvedValue({ id: 2, name: 'Americano' });
    await expect(service.findOne(2)).resolves.toMatchObject({ id: 2 });
  });

  it('findOne ném NotFoundException khi không có sản phẩm', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('onModuleInit nạp toàn bộ menu mẫu khi bảng trống', async () => {
    repo.find.mockResolvedValue([]);
    await service.onModuleInit();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0][0].length).toBe(SEED_PRODUCTS.length);
  });

  it('onModuleInit cập nhật giá món đã có nhưng giữ tồn kho, và archive món cũ', async () => {
    repo.find.mockResolvedValue([
      { id: 1, name: 'Cafe sữa', price: 1, stock: 7, category: 'ca-phe' },
      { id: 2, name: 'Trà đào', price: 39000, stock: 5, category: 'tra' },
    ]);
    await service.onModuleInit();
    const saved = repo.save.mock.calls[0][0] as any[];
    expect(saved.find((p) => p.name === 'Cafe sữa')).toMatchObject({ id: 1, stock: 7, price: 29000 });
    expect(saved.find((p) => p.name === 'Trà đào')).toMatchObject({ id: 2, category: 'archived' });
  });
});
