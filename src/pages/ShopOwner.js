import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  DashboardError,
  DashboardRowSkeleton,
  DashboardShell,
  DashboardStat,
  DashboardStatSkeleton,
} from '../components/DashboardShell';
import Illustration from '../components/Illustration';
import Stars from '../components/Stars';
import { chatHistory } from '../data/mock';
import { API_BASE_URL } from '../utils/api';

const DEFAULT_SHOP_ID = '44444444-4444-4444-4444-444444444444';
const filters = ['All', 'Low stock', 'Sold out'];

function pickArt(category = '', title = '') {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes('book') || text.includes('supply') || text.includes('supplies') || text.includes('note')) return 'book';
  if (text.includes('calc')) return 'calculator';
  if (text.includes('lab') || text.includes('meter')) return 'multimeter';
  return 'shirt';
}

function ShopOwner() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [shop, setShop] = useState({
    name: 'Engineering Student Council',
    subtitle: 'Made by students, for students',
    status: 'Approved',
    rating: 4.9,
    reviews: 28,
  });
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState('');
  const [messages, setMessages] = useState(chatHistory);
  const [messageDraft, setMessageDraft] = useState('');

  // Fetches live shop profile, inventory, and customer orders from ASP.NET Core ShopsController.
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      // GET /api/Shops/{shopId} — loads shop name and approval status from Shops table.
      // GET /api/Shops/{shopId}/inventory — loads all Listings owned by this shop.
      // GET /api/Shops/{shopId}/orders — loads all Transactions for this shop's listings.
      const [shopRes, invRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}`),
        fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/inventory`),
        fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/orders`),
      ]);

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShop((prev) => ({
          ...prev,
          name: shopData.shopName || prev.name,
          status: shopData.status || prev.status,
        }));
      }

      if (!invRes.ok) throw new Error('Inventory request failed');
      const invData = await invRes.json();
      setItems((Array.isArray(invData) ? invData : []).map((item) => ({
        id: item.listingId,
        name: item.title,
        description: item.category,
        priceValue: Number(item.price ?? 0),
        price: `₱${Number(item.price ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        stock: Number(item.stockQuantity ?? 0),
        art: pickArt(item.category, item.title),
      })));

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders((Array.isArray(ordersData) ? ordersData : []).map((order) => ({
          id: order.transactionId,
          shortId: `ORD-${String(order.transactionId).slice(0, 6).toUpperCase()}`,
          buyer: order.buyerEmail,
          item: order.itemTitle,
          totalValue: Number(order.total ?? 0),
          total: `₱${Number(order.total ?? 0).toLocaleString('en-PH')}`,
          method: order.paymentMethod || 'GCash',
          proof: order.paymentMethod === 'Cash' ? 'Cash on pickup' : 'GCash transfer',
          status: order.status || 'Paid',
        })));
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const shopTitle = shop.name.split(' ');
  const pendingOrders = orders.filter((order) => order.status !== 'Completed' && order.status !== 'Cancelled');
  const totalRevenue = orders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => sum + order.totalValue, 0);
  const openChats = messages.filter((message) => !message.own).length;

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

  const liveItems = items.filter((item) => item.stock > 0).length;
  const soldOutItems = items.filter((item) => item.stock === 0).length;

  // PATCH /api/Shops/{shopId}/inventory/{listingId}/stock — saves +/- stock updates to Listings table.
  const updateStock = async (id, change) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const nextStock = Math.max(0, target.stock + change);

    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, stock: nextStock } : item
    )));
    setIsSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/inventory/${encodeURIComponent(id)}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: nextStock }),
      });
      if (!res.ok) throw new Error('Failed to save stock');
    } catch {
      setLoadError(true);
      setItems((current) => current.map((item) => (
        item.id === id ? { ...item, stock: target.stock } : item
      )));
    } finally {
      setIsSaving(false);
    }
  };

  // PATCH /api/Shops/{shopId}/orders/{transactionId}/complete — marks a customer order Completed in Transactions table.
  const handleCompleteOrder = async (transactionId) => {
    setCompletingOrderId(transactionId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/orders/${encodeURIComponent(transactionId)}/complete`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Could not complete order');
      setOrders((current) => current.map((order) => (
        order.id === transactionId ? { ...order, status: 'Completed' } : order
      )));
    } catch {
      setLoadError(true);
    } finally {
      setCompletingOrderId('');
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text) return;
    setMessages((current) => [...current, {
      id: `shop-message-${Date.now()}`,
      sender: 'Shop',
      text,
      own: true,
    }]);
    setMessageDraft('');
  };

  const nav = [
    { id: 'inventory', label: 'Inventory', icon: '▣' },
    { id: 'orders', label: 'Orders & payments', icon: '▤', count: pendingOrders.length },
    { id: 'support', label: 'Support chat', icon: '◌', count: openChats },
    { id: 'storefront', label: 'Storefront', icon: '★' },
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
      returnTo="/shop"
      returnLabel="View public shop"
    >
      {loadError && <DashboardError onRetry={loadDashboard} />}
      {pendingOrders.length > 0 && (
        <section className="dash-attention" aria-label="Needs attention">
          <span className="dash-attention-icon" aria-hidden="true">!</span>
          <div>
            <strong>{pendingOrders.length} order{pendingOrders.length === 1 ? '' : 's'} need{pendingOrders.length === 1 ? 's' : ''} you</strong>
            <span>Review customer payments and confirm campus handoffs</span>
          </div>
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
            <DashboardStat icon="↗" label="Orders pending" value={pendingOrders.length} hint={`${orders.length} total recorded`} attention={pendingOrders.length > 0} onClick={() => setActiveTab('orders')} />
            <DashboardStat icon="₱" label="Recorded sales" value={`₱${totalRevenue.toLocaleString('en-PH')}`} hint="From live transactions" onClick={() => setActiveTab('orders')} />
            <DashboardStat icon="✦" label="Support chats" value={openChats} hint="Customer messages" onClick={() => setActiveTab('support')} />
          </>
        )}
      </section>

      {activeTab === 'inventory' && (
        <section className="dash-card dash-inventory-card">
          <div className="dash-inventory-heading">
            <div><span className="dash-section-eyebrow">MERCHANDISE</span><h2>Inventory</h2></div>
            <span className={`dash-save-status${isSaving ? ' saving' : ''}`} role="status">{isSaving ? 'Saving…' : '✓ Saved'}</span>
            <Link to="/shop-owner/inventory/new" className="dash-primary-button">+ Add item</Link>
          </div>

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
                  <span className="dash-order-copy"><strong>{order.item}</strong><span>{order.shortId} · {order.buyer} · {order.total}</span></span>
                  <span className="dash-order-payment"><strong>{order.method}</strong><span>{order.proof}</span></span>
                  <span className={`dash-stock-status ${order.status === 'Completed' ? 'in-stock' : 'low-stock'}`}>{order.status}</span>
                  <button
                    type="button"
                    className="dash-outline-button"
                    disabled={order.status === 'Completed' || completingOrderId === order.id}
                    onClick={() => handleCompleteOrder(order.id)}
                  >
                    {order.status === 'Completed' ? 'Completed' : completingOrderId === order.id ? 'Saving...' : 'Mark completed'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="dash-empty-list"><strong>No orders yet</strong><span>New campus orders will appear here when students purchase your items.</span></div>
          )}
        </section>
      )}

      {activeTab === 'support' && (
        <section className="dash-card dash-support-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">CUSTOMER CARE</span><h2>Support chat</h2></div>
            <span className="dash-count-light">{openChats} open messages</span>
          </div>
          {isLoading ? (
            <><DashboardRowSkeleton /><DashboardRowSkeleton /></>
          ) : messages.length ? (
            <>
              <div className="dash-support-messages" aria-live="polite" aria-label="Support conversation">
                {messages.map((message) => (
                  <article className={`dash-support-message${message.own ? ' own' : ''}`} key={message.id}>
                    <span>{message.sender}</span><p>{message.text}</p>
                  </article>
                ))}
              </div>
              <form className="dash-support-compose" onSubmit={handleSendMessage}>
                <label className="sr-only" htmlFor="shop-support-message">Reply as the shop</label>
                <input id="shop-support-message" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Reply as the shop" />
                <button type="submit" className="dash-primary-button" disabled={!messageDraft.trim()}>Send message</button>
              </form>
            </>
          ) : (
            <div className="dash-empty-list"><strong>No support chats</strong><span>Customer messages will appear here.</span></div>
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
                  <span className="dash-approved">✓ {shop.status === 'Approved' ? 'Admin approved shop' : 'Pending approval'}</span>
                  <h3>{shop.name}</h3>
                  <p>{shop.subtitle} · Student Center, CIT-U</p>
                  <div className="dash-store-rating"><Stars rating={shop.rating} count={shop.reviews} /><span>Accepts GCash QR &amp; cash</span></div>
                </div>
              </div>
              {items.length ? (
                <div className="dash-store-items">
                  {items.map((item) => (
                    <article className="dash-store-item" key={item.id}>
                      <span className="dash-store-item-art"><Illustration type={item.art} /></span>
                      <div><strong>{item.name}</strong><span>{item.description} · {item.stock} in stock</span><small>{item.price}</small></div>
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
    </DashboardShell>
  );
}

export default ShopOwner;
