export function normalizeImageUrls(product = {}) {
  const candidates = [];

  if (Array.isArray(product.imageUrls)) {
    candidates.push(...product.imageUrls);
  }

  if (product.imageUrl) {
    candidates.unshift(product.imageUrl);
  }

  return [...new Set(candidates.map(value => String(value || '').trim()).filter(Boolean))];
}

export function getPrimaryImageUrl(product = {}) {
  return normalizeImageUrls(product)[0] || '';
}
