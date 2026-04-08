export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Baking',
  'Out for delivery',
  'Delivered',
  'Cancelled',
];

export const ACTIVE_ORDER_STATUSES = ORDER_STATUSES.filter(
  status => status !== 'Cancelled'
);

export function getOrderStatusIndex(status) {
  const currentStatus = status || 'Pending';
  return ACTIVE_ORDER_STATUSES.indexOf(currentStatus);
}

export function isOrderStepComplete(status, step) {
  if ((status || 'Pending') === 'Cancelled') {
    return false;
  }

  return getOrderStatusIndex(status) >= ACTIVE_ORDER_STATUSES.indexOf(step);
}

export function getOrderProgressLabel(status) {
  if ((status || 'Pending') === 'Cancelled') {
    return 'Order cancelled';
  }

  return status || 'Pending';
}
