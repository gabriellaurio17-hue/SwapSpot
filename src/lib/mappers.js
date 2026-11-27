// Converts database rows (snake_case columns) into UI-facing shapes.
import { getListingPhotoUrl } from './storage';

const ART_BY_CATEGORY = {
  Textbooks: 'book',
  Calculators: 'calculator',
  'Lab gear': 'multimeter',
  'Org merch': 'shirt',
};

function formatAdminDate(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function mapAdminReport(row, listing, reporter) {
  return {
    id: row.id,
    item: listing?.title || (row.target_user_id ? 'Account report' : 'Listing unavailable'),
    reason: row.reason,
    reporter: reporter?.full_name || 'Unknown reporter',
    createdAt: formatAdminDate(row.created_at),
    targetListingId: row.target_listing_id,
    targetUserId: row.target_user_id || listing?.seller_id || null,
    art: ART_BY_CATEGORY[listing?.category] || 'book',
  };
}

export function mapAdminApplication(row, owner) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    shopType: row.shop_type,
    ownerName: owner?.full_name || 'Unknown applicant',
    submitted: formatAdminDate(row.created_at),
  };
}

export function mapAdminAuditEntry(row, actor) {
  return {
    id: row.id,
    time: formatAdminDate(row.created_at),
    admin: actor?.full_name || 'Unknown admin',
    action: row.action,
    target: `${row.target_type}${row.target_id ? ` · ${row.target_id}` : ''}`,
    details: row.details && Object.keys(row.details).length
      ? JSON.stringify(row.details)
      : '',
  };
}

export function mapProfile(row) {
  const name = row.full_name || '';
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?';
  const roleLabel = {
    student: 'Student',
    store_owner: 'Shop Owner',
    admin: 'Admin',
  }[row.role] || row.role;
  const statusLabel = {
    active: 'Active',
    suspended: 'Suspended',
  }[row.status] || row.status;
  const memberSince = row.created_at
    ? new Date(row.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })
    : '';

  return {
    id: row.id,
    name,
    initials,
    email: row.email || '',
    role: roleLabel,
    status: statusLabel,
    gcashQrPath: row.gcash_qr_path || null,
    memberSince,
  };
}

export function mapListing(row) {
  const isRent = row.listing_type === 'rent';
  const priceAmount = Number(row.price);
  const formattedPrice = `₱${priceAmount.toLocaleString('en-PH')}`;

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    category: row.category,
    condition: row.condition || 'Not specified',
    price: isRent ? `${formattedPrice} / day` : formattedPrice,
    priceAmount,
    mode: isRent ? 'Rent' : 'Sell',
    rating: 0,
    location: row.location || '',
    art: ART_BY_CATEGORY[row.category] || 'book',
    under500: priceAmount < 500,
    sellerName: row.seller?.full_name || '',
    sellerRating: row.seller?.avg_rating || 0,
    sellerRatingCount: row.seller?.rating_count || 0,
    status: row.status,
    isSold: row.listing_type === 'sale' && row.status === 'unavailable' && Number(row.stock) === 0,
    photoUrl: row.photo_path ? getListingPhotoUrl(row.photo_path) : null,
    maxRentalDays: row.max_rental_days || null,
    depositAmount: row.deposit_amount || 0,
    stock: row.stock == null ? 1 : row.stock,
  };
}

export function mapShopInventoryItem(row) {
  return {
    id: row.id,
    name: row.title,
    description: row.description || '',
    category: row.category,
    condition: row.condition || 'Not specified',
    price: `₱${Number(row.price).toLocaleString('en-PH')}`,
    stock: Number(row.stock || 0),
    status: row.status,
    art: ART_BY_CATEGORY[row.category] || 'book',
    photoUrl: row.photo_path ? getListingPhotoUrl(row.photo_path) : null,
  };
}

export function mapRental(row, me) {
  const transaction = row.transaction || {};
  const listing = transaction.listing || {};
  const isLending = transaction.seller_id === me;
  const statusLabels = {
    requested: 'Requested',
    approved: 'Approved',
    active: 'Ongoing',
    returned: 'Returned',
    completed: 'Completed',
    rejected: 'Rejected',
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return {
    id: row.id,
    transactionId: transaction.id,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    listingId: listing.id,
    role: isLending ? 'I’m lending' : 'I’m renting',
    item: listing.title || 'Rental listing',
    person: isLending ? 'To the renter' : 'From the lender',
    status: statusLabels[row.status] || row.status,
    rawStatus: row.status,
    dates: `${formatDate(row.start_date)} – ${formatDate(row.due_date)}`,
    startDate: row.start_date,
    dueDate: row.due_date,
    deposit: `₱${Number(row.deposit_amount || 0).toLocaleString('en-PH')}`,
    depositAmount: Number(row.deposit_amount || 0),
  };
}