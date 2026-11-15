import { MigrationInterface } from 'typeorm';
import { InitialSchema1794733928940 } from './1794733928940-InitialSchema';
import { AddRolesAndProductActive1794800000000 } from './1794800000000-AddRolesAndProductActive';

/** Danh sách migration theo thứ tự thời gian. Thêm migration mới vào cuối mảng. */
export const migrations: Array<new () => MigrationInterface> = [
  InitialSchema1794733928940,
  AddRolesAndProductActive1794800000000,
];
