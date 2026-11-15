import { OrderStatus } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/orders';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`} data-testid="order-status">
      {STATUS_LABEL[status]}
    </span>
  );
}
