const FALLBACK_SLUG = 'umrah-package';
const PACKAGE_ROUTE_BASE = 'umra-package';

const toSlug = (value = '') => {
  const text = String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return text || FALLBACK_SLUG;
};

const getPackageTitle = (pkg = {}) => pkg.title || pkg.name || 'Umrah Package';

const createPackagePath = (pkgOrId, title) => {
  if (pkgOrId && typeof pkgOrId === 'object') {
    const id = pkgOrId.id;
    const slug = toSlug(getPackageTitle(pkgOrId));
    return `/${PACKAGE_ROUTE_BASE}/${slug}/${id}`;
  }

  const slug = toSlug(title || 'Umrah Package');
  return `/${PACKAGE_ROUTE_BASE}/${slug}/${pkgOrId}`;
};

export { toSlug, createPackagePath };