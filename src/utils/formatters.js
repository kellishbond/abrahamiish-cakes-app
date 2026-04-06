export function formatCurrency(amount = 0) {
  return `NGN ${Number(amount || 0).toLocaleString()}`;
}

export function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set';
  }

  return parsed.toLocaleDateString();
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AC';
}
