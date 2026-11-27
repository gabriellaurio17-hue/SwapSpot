import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  DashboardError,
  DashboardRowSkeleton,
  DashboardShell,
  DashboardStat,
  DashboardStatSkeleton,
} from '../components/DashboardShell';
import GcashQrSettings from '../components/GcashQrSettings';
import Illustration from '../components/Illustration';
import ReportNotifications from '../components/ReportNotifications';
import { useAuth } from '../context/AuthContext';
import { mapProfile, mapShopInventoryItem } from '../lib/mappers';
import { supabase } from '../lib/supabaseClient';

const filters = ['All', 'Low stock', 'Sold out'];

function getWeekStart() {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return weekStart;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  });
}

function ShopOwner() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shop, setShop] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [metricsError, setMetricsError] = useState('');
  const [liveUpdateError, setLiveUpdateError] = useState('');
  const [stockError, setStockError] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(null);
  const [revenueThisWeek, setRevenueThisWeek] = useState(null);
  const [mappedShopOwner, setMappedShopOwner] = useState(null);
  const shopTitle = (shop?.name || 'My shop').split(' ');
  const pendingOrders = orders.filter((order) => order.paymentStatus !== 'paid');

  useEffect(() => {
    if (profile) {
      setMappedShopOwner(mapProfile(profile));
    } else {
      setMappedShopOwner(null);
    }
  }, [profile]);

  const fetchShopData = useCallback(async (silent = false) => {
    if (!user?.id) {
      setIsLoading(false);
      setLoadError('Please log in to manage your shop.');
      return;
    }

    if (!silent) setIsLoading(true);
    setLoadError('');
    setMetricsError('');
    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (shopError) throw shopError;
      setShop(shopData);

      if (!shopData) {
        setItems([]);
        setOrders([]);
        setUnreadChatCount(0);
        setRevenueThisWeek(0);
        setMetricsError('');
        setLoadError('No shop is associated with this account.');
        return;
      }

      const [
        { data: listingData, error: listingError },
        { data: transactionData, error: transactionError },
      ] = await Promise.all([
        supabase
          .from('listings')
          .select('*')
          .eq('shop_id', shopData.id)
          .neq('status', 'removed')
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('id, listing_id, buyer_id, payment_method, payment_status, created_at')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (listingError) throw listingError;
      setItems((listingData || []).map(mapShopInventoryItem));
      if (transactionError) throw transactionError;

      const txRows = transactionData || [];
      const listingIds = [...new Set(txRows.map((row) => row.listing_id).filter(Boolean))];
      const buyerIds = [...new Set(txRows.map((row) => row.buyer_id).filter(Boolean))];
      const [listingResult, buyerResult] = await Promise.all([
        listingIds.length
          ? supabase.from('listings').select('id, title, listing_type').in('id', listingIds)
          : Promise.resolve({ data: [], error: null }),
        buyerIds.length
          ? supabase.from('public_profiles').select('id, full_name').in('id', buyerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (listingResult.error) throw listingResult.error;
      if (buyerResult.error) throw buyerResult.error;

      const listingById = new Map((listingResult.data || []).map((row) => [row.id, row]));
      const buyerById = new Map((buyerResult.data || []).map((row) => [row.id, row]));
      setOrders(txRows.map((row) => ({
        id: row.id,
        buyer: buyerById.get(row.buyer_id)?.full_name || 'Campus buyer',
        item: listingById.get(row.listing_id)?.title || 'Listing',
        total: '—',
        method: row.payment_method === 'gcash' ? 'GCash' : row.payment_method === 'cash' ? 'Cash' : 'Not selected',
        paymentStatus: row.payment_status,
      })));
      if (!silent) setIsLoading(false);

      const weekStart = getWeekStart().toISOString();
      const [revenueResult, unreadChatResult] = await Promise.allSettled([
        supabase
          .from('transactions')
          .select('amount')
          .eq('seller_id', user.id)
          .eq('payment_status', 'paid')
          .gte('paid_at', weekStart),
        supabase.rpc('shop_owner_unread_chat_count'),
      ]);
      const metricErrors = [];

      if (revenueResult.status === 'fulfilled' && !revenueResult.value.error) {
        setRevenueThisWeek((revenueResult.value.data || [])
          .reduce((total, row) => total + Number(row.amount || 0), 0));
      } else {
        const error = revenueResult.status === 'rejected'
          ? revenueResult.reason
          : revenueResult.value.error;
        setRevenueThisWeek(null);
        metricErrors.push(`Revenue: ${error.message || 'unavailable'}`);
      }

      if (unreadChatResult.status === 'fulfilled' && !unreadChatResult.value.error) {
        setUnreadChatCount(Number(unreadChatResult.value.data) || 0);
      } else {
        const error = unreadChatResult.status === 'rejected'
          ? unreadChatResult.reason
          : unreadChatResult.value.error;
        setUnreadChatCount(null);
        metricErrors.push(`Support chats: ${error.message || 'unavailable'}`);
      }
      setMetricsError(metricErrors.join(' '));
    } catch (error) {
      setLoadError(error.message || 'Could not load your shop data.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => fetchShopData(true), 200);
    };
    const channel = supabase
      .channel(`shop-owner-dashboard-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listings',
        filter: `seller_id=eq.${user.id}`,
      }, scheduleRefresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `seller_id=eq.${user.id}`,
      }, scheduleRefresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_threads',
        filter: `seller_id=eq.${user.id}`,
      }, scheduleRefresh)
      .subscribe((status, subscriptionError) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLiveUpdateError(subscriptionError?.message || 'Live dashboard updates are unavailable.');
        } else if (status === 'SUBSCRIBED') {
          setLiveUpdateError('');
        }
      });

    return () => {
      window.clearTimeout(refreshTimeout);
      supabase.removeChannel(channel).then((status) => {
        if (status !== 'ok') console.error('Failed to remove shop dashboard channel:', status);
      }).catch((error) => console.error('Failed to remove shop dashboard channel:', error));
    };
  }, [fetchShopData, user?.id]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = `${item.name} ${item.description}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'All'
        || (filter === 'Low stock' && item.stock > 0 && item.stock <= 10)
        || (filter === 'Sold out' && item.stock === 0);
      return matchesSearch && matchesFilter;
    });
  }, [filter, items, search]);

  const liveItems = items.filter((item) => item.status === 'available' && item.stock > 0).length;
  const soldOutItems = items.filter((item) => item.stock === 0).length;

  const handleRetry = () => {
    fetchShopData();
  };

  const updateStock = useCallback(async (id, change) => {
    const item = items.find((current) => current.id === id);
    if (!item) return;
    const nextStock = Math.max(0, item.stock + change);
    setItems((current) => current.map((currentItem) => (
      currentItem.id === id
        ? {
          ...currentItem,
          stock: nextStock,
          ...(nextStock > 0 && currentItem.status === 'unavailable'
            ? { status: 'available' }
            : {}),
        }
        : currentItem
    )));
    setIsSaving(true);
    setStockError('');
    try {
      const restoreSoldListing = nextStock > 0 && item.status === 'unavailable';
      const { error } = await supabase
        .from('listings')
        .update({
          stock: nextStock,
          ...(restoreSoldListing ? { status: 'available' } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      setStockError(error.message || 'Could not save stock.');
      await fetchShopData();
    } finally {
      setIsSaving(false);
    }
  }, [items, fetchShopData]);

  const nav = [
    { id: 'inventory', label: 'Inventory', icon: '▣' },
    { id: 'orders', label: 'Orders & payments', icon: '▤', count: pendingOrders.length },
    { id: 'support', label: 'Support chat', icon: '◌', count: unreadChatCount === null ? undefined : unreadChatCount },
    { id: 'storefront', label: 'Storefront', icon: '★' },
    { id: 'account', label: 'Account', icon: '◌' },
  ];

  return (
    <DashboardShell
      label="SHOP WORKSPACE"
      nav={nav}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      eyebrow="CAMPUS STOREFRONT"
      title={<>{shopTitle.slice(0, -1).join(' ')} <em>{shopTitle[shopTitle.length - 1]}</em></>}
      user={{ initials: 'SC', name: 'Shop owner', role: 'Operations' }}
      returnTo="/"
      returnLabel="Return to marketplace"
    >
      <ReportNotifications userId={user?.id} />
      {loadError && <DashboardError onRetry={handleRetry} />}
      {(metricsError || liveUpdateError) && (
        <p className="dash-readonly-note" role="status">
          {[metricsError, liveUpdateError].filter(Boolean).join(' ')}
        </p>
      )}
      {shop && shop.status !== 'approved' && (
        <section className="dash-attention" aria-label="Shop approval status">
          <span className="dash-attention-icon" aria-hidden="true">!</span>
          <div><strong>Shop status: {shop.status}</strong><span>Adding inventory is disabled until an administrator approves your shop.</span></div>
        </section>
      )}
      {pendingOrders.length > 0 && (
        <section className="dash-attention" aria-label="Needs attention">
          <span className="dash-attention-icon" aria-hidden="true">!</span>
          <div><strong>{pendingOrders.length} orders need you</strong><span>Review pending payment status and transaction details.</span></div>
          <button type="button" className="dash-attention-button" onClick={() => setActiveTab('orders')}>Review orders</button>
        </section>
      )}

      <section className="dash-stats" aria-label="Shop overview">
        {isLoading ? (
          <>
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
          </>
        ) : (
          <>
            <DashboardStat icon="▣" label="Items live" value={liveItems} hint={`${soldOutItems} sold out`} onClick={() => setActiveTab('inventory')} />
            <DashboardStat icon="↗" label="Orders pending" value={pendingOrders.length} hint="Oldest waiting 1 day" attention onClick={() => setActiveTab('orders')} />
            <DashboardStat icon="₱" label="Revenue this week" value={revenueThisWeek === null ? '—' : formatCurrency(revenueThisWeek)} hint="Paid item sales this week" onClick={() => setActiveTab('orders')} />
            <DashboardStat icon="✦" label="Support chats" value={unreadChatCount === null ? '—' : unreadChatCount} hint="Unread buyer conversations" onClick={() => setActiveTab('support')} />
          </>
        )}
      </section>

      {activeTab === 'inventory' && (
        <section className="dash-card dash-inventory-card">
          <div className="dash-inventory-heading">
            <div><span className="dash-section-eyebrow">MERCHANDISE</span><h2>Inventory</h2></div>
            <span className={`dash-save-status${isSaving ? ' saving' : ''}`} role="status">{isSaving ? 'Saving…' : '✓ Saved'}</span>
            {shop?.status === 'approved' ? (
              <Link to="/shop-owner/inventory/new" className="dash-primary-button">+ Add item</Link>
            ) : (
              <button type="button" className="dash-primary-button" disabled>+ Add item</button>
            )}
          </div>
          {stockError && <p className="field-error" role="alert" style={{ padding: '0 20px' }}>{stockError}</p>}

          <div className="dash-inventory-tools">
            <label className="dash-search">
              <span className="sr-only">Search inventory items</span>
              <span aria-hidden="true">⌕</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inventory" />
            </label>
            <div className="dash-filter-list" role="group" aria-label="Filter inventory">
              {filters.map((itemFilter) => (
                <button
                  type="button"
                  className={filter === itemFilter ? 'active' : ''}
                  aria-pressed={filter === itemFilter}
                  key={itemFilter}
                  onClick={() => setFilter(itemFilter)}
                >
                  {itemFilter}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-inventory-list" role="list" aria-label="Inventory items">
            {isLoading ? (
              <><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></>
            ) : filteredItems.length ? (
              filteredItems.map((item) => {
                const status = item.stock === 0 ? 'Sold out' : item.stock <= 10 ? 'Low stock' : 'In stock';
                return (
                  <article className="dash-inventory-row" role="listitem" key={item.id}>
                    <span className={`dash-item-art dash-item-art-${item.art}`}><Illustration type={item.art} /></span>
                    <span className="dash-item-copy"><strong>{item.name}</strong><span>{item.description}</span></span>
                    <strong className="dash-item-price">{item.price}</strong>
                    <span className="dash-stock-stepper" role="group" aria-label={`Stock for ${item.name}`}>
                      <button type="button" aria-label={`Decrease ${item.name} stock`} disabled={item.stock === 0} onClick={() => updateStock(item.id, -1)}>−</button>
                      <strong aria-live="polite">{item.stock}</strong>
                      <button type="button" aria-label={`Increase ${item.name} stock`} onClick={() => updateStock(item.id, 1)}>+</button>
                    </span>
                    <span className={`dash-stock-status ${item.stock === 0 ? 'sold-out' : item.stock <= 10 ? 'low-stock' : 'in-stock'}`}>{status}</span>
                    <Link to={`/shop-owner/inventory/${item.id}/edit`} className="dash-edit-button" aria-label={`Edit ${item.name}`} title={`Edit ${item.name}`}>✎</Link>
                  </article>
                );
              })
            ) : items.length ? (
              <div className="dash-empty-list">
                <strong>No items match these filters</strong>
                <span>Try a different search or stock filter.</span>
                <button type="button" className="dash-text-link" onClick={() => { setSearch(''); setFilter('All'); }}>Clear filters</button>
              </div>
            ) : (
              <div className="dash-empty-list"><strong>Your inventory is empty</strong><span>Add an item to start filling your storefront.</span></div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'orders' && (
        <section className="dash-card dash-list-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">TRANSACTIONS</span><h2>Orders &amp; payments</h2></div>
            <span className="dash-count-light">{pendingOrders.length} pending</span>
          </div>
          {isLoading ? (
            <><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></>
          ) : orders.length ? (
            <div className="dash-orders-list">
              {orders.map((order) => (
                <article className="dash-order-row" key={order.id}>
                  <span className="dash-order-mark" aria-hidden="true">₱</span>
                  <span className="dash-order-copy"><strong>{order.item}</strong><span>{order.id} · {order.buyer}</span></span>
                  <span className="dash-order-payment"><strong>{order.method}</strong><span>{order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}</span></span>
                  <span className={`dash-stock-status ${order.paymentStatus === 'paid' ? 'in-stock' : 'low-stock'}`}>{order.paymentStatus}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="dash-empty-list"><strong>No orders yet</strong><span>New campus orders will appear here.</span></div>
          )}
        </section>
      )}

      {activeTab === 'support' && (
        <section className="dash-card dash-support-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">CUSTOMER CARE</span><h2>Support chat</h2></div>
            <span className="dash-count-light">{unreadChatCount === null ? 'Unavailable' : `${unreadChatCount} unread`}</span>
          </div>
          {isLoading ? (
            <DashboardRowSkeleton />
          ) : loadError ? (
            <p className="field-error" role="alert">{loadError}</p>
          ) : (
            <div className="dash-empty-list">
              <strong>
                {unreadChatCount === null
                  ? 'Unread count unavailable'
                  : unreadChatCount
                    ? `${unreadChatCount} unread buyer chats`
                    : 'You’re all caught up'}
              </strong>
              <span>Messages are marked as read when you open their conversation.</span>
              <Link to="/messages" className="dash-primary-button">Open messages</Link>
            </div>
          )}
        </section>
      )}

      {activeTab === 'storefront' && (
        <section className="dash-card dash-storefront-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">STOREFRONT</span><h2>Public storefront</h2></div>
            <Link to="/shop" className="dash-outline-button">Preview shop</Link>
          </div>
          {isLoading ? (
            <DashboardRowSkeleton />
          ) : (
            <>
              <div className="dash-store-banner">
                <span className="dash-store-emblem">ESC</span>
                <div>
                  <span className={shop?.status === 'approved' ? 'dash-approved' : 'dash-stock-status'}>{shop?.status === 'approved' ? '✓ Admin approved shop' : `Shop status: ${shop?.status}`}</span>
                  <h3>{shop?.name || 'My shop'}</h3>
                  <p>{shop?.description || 'Campus storefront'} · CIT-U</p>
                  <div className="dash-store-rating"><span>Accepts GCash QR &amp; cash</span></div>
                </div>
              </div>
              {items.length ? (
                <div className="dash-store-items">
                  {items.filter((item) => item.stock > 0).map((item) => (
                    <article className="dash-store-item" key={item.id}>
                      <span className="dash-store-item-art"><Illustration type={item.art} /></span>
                      <div><strong>{item.name}</strong><span>{item.description}</span><small>{item.price}</small></div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dash-empty-list"><strong>No storefront items</strong><span>Add inventory items to feature them here.</span></div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === 'account' && mappedShopOwner && (
        <section className="dash-card dash-profile-card" style={{ marginTop: 24, borderRadius: 12, background: '#ffffff', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          <div className="dash-profile-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <span className="dash-section-eyebrow" style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>SHOP OWNER PROFILE</span>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>Shop owner account</h2>
            </div>
          </div>
          <div className="dash-profile-list" style={{ padding: '24px' }}>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Full name</span>
                <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mappedShopOwner.name}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Email address</span>
                <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mappedShopOwner.email}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Campus role</span>
                <span className="dash-profile-value" style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{mappedShopOwner.role}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Account status</span>
                <span className="dash-profile-value" style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{mappedShopOwner.status}</span>
              </div>
            </article>
            <GcashQrSettings userId={user?.id} initialPath={profile?.gcash_qr_path} />
          </div>
        </section>
      )}
    </DashboardShell>
  );
}

export default ShopOwner;
