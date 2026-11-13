import React, { useEffect, useMemo, useState } from 'react';
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
import inventory from '../data/shopOwnerInventory';
import { chatHistory, shops, shopItems } from '../data/mock';

const initialOrders = [
  { id: 'ORD-101', buyer: 'J. Lim', item: 'Heritage tee (M)', total: '₱420', method: 'GCash', proof: 'Proof uploaded', status: 'Awaiting confirmation' },
  { id: 'ORD-102', buyer: 'P. Reyes', item: 'Campus notebook', total: '₱160', method: 'Cash', proof: 'Cash on pickup', status: 'Ready for pickup' },
  { id: 'ORD-103', buyer: 'A. Mendoza', item: 'Engineering org tee (L)', total: '₱380', method: 'GCash', proof: 'Proof uploaded', status: 'Completed' },
];

const filters = ['All', 'Low stock', 'Sold out'];

function ShopOwner() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [items, setItems] = useState(inventory);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState(chatHistory);
  const [messageDraft, setMessageDraft] = useState('');
  const shop = shops[0];
  const shopTitle = shop.name.split(' ');
  const pendingOrders = initialOrders.filter((order) => order.status !== 'Completed');
  const openChats = messages.filter((message) => !message.own).length;

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSaving) return undefined;
    const timer = window.setTimeout(() => setIsSaving(false), 500);
    return () => window.clearTimeout(timer);
  }, [isSaving]);

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

  const handleRetry = () => {
    setLoadError(false);
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 350);
  };

  const updateStock = (id, change) => {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, stock: Math.max(0, item.stock + change) } : item
    )));
    setIsSaving(true);
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
    { id: 'support', label: 'Support chat', icon: '◌', count: 2 },
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
      {loadError && <DashboardError onRetry={handleRetry} />}
      <section className="dash-attention" aria-label="Needs attention">
        <span className="dash-attention-icon" aria-hidden="true">!</span>
        <div><strong>2 orders need you</strong><span>1 GCash proof to confirm · 1 ready for pickup</span></div>
        <button type="button" className="dash-attention-button" onClick={() => setActiveTab('orders')}>Review orders</button>
      </section>

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
            <DashboardStat icon="₱" label="Revenue this week" value="₱2,790" hint="+₱420 vs last week" onClick={() => setActiveTab('orders')} />
            <DashboardStat icon="✦" label="Support chats" value="2" hint="Avg reply 18 min" onClick={() => setActiveTab('support')} />
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
          ) : initialOrders.length ? (
            <div className="dash-orders-list">
              {initialOrders.map((order) => (
                <article className="dash-order-row" key={order.id}>
                  <span className="dash-order-mark" aria-hidden="true">₱</span>
                  <span className="dash-order-copy"><strong>{order.item}</strong><span>{order.id} · {order.buyer} · {order.total}</span></span>
                  <span className="dash-order-payment"><strong>{order.method}</strong><span>{order.proof}</span></span>
                  <span className={`dash-stock-status ${order.status === 'Completed' ? 'in-stock' : 'low-stock'}`}>{order.status}</span>
                  <button type="button" className="dash-outline-button" disabled={order.status === 'Completed'}>{order.proof === 'Proof uploaded' ? 'View proof' : 'Update'}</button>
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
                  <span className="dash-approved">✓ Admin approved shop</span>
                  <h3>{shop.name}</h3>
                  <p>{shop.subtitle} · Student Center, CIT-U</p>
                  <div className="dash-store-rating"><Stars rating={shop.rating} count={shop.reviews} /><span>Accepts GCash QR &amp; cash</span></div>
                </div>
              </div>
              {shopItems.length ? (
                <div className="dash-store-items">
                  {shopItems.map((item) => (
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
    </DashboardShell>
  );
}

export default ShopOwner;
