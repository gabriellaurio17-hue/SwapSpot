import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import useChat from '../hooks/useChat';

function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState('');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      setThreadsLoading(true);
      setThreadsError('');
      try {
        const { data, error } = await supabase
          .from('chat_threads')
          .select('id, listing_id, buyer_id, seller_id, created_at, listing:listings(id, title)')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (cancelled) return;
        const loadedThreads = data || [];
        setThreads(loadedThreads);
        setSelectedThreadId((current) => (
          loadedThreads.some((thread) => thread.id === current)
            ? current
            : loadedThreads[0]?.id || null
        ));
      } catch (error) {
        if (!cancelled) setThreadsError(error.message || 'Could not load your conversations.');
      } finally {
        if (!cancelled) setThreadsLoading(false);
      }
    }

    if (!user?.id) {
      setThreads([]);
      setSelectedThreadId(null);
      setThreadsError('Sign in to view your messages.');
      setThreadsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || null;
  const {
    threadId,
    messages,
    loading: chatLoading,
    sending,
    error: chatError,
    sendMessage,
  } = useChat(selectedThread?.listing_id, selectedThread?.seller_id, selectedThread?.id);

  useEffect(() => {
    setDraft('');
  }, [selectedThreadId]);

  const handleSend = useCallback(async (event) => {
    event.preventDefault();
    if (!draft.trim() || sending || !threadId) return;
    const sent = await sendMessage(draft);
    if (sent) setDraft('');
  }, [draft, sending, threadId, sendMessage]);

  const partnerLabel = selectedThread?.buyer_id === user?.id ? 'Seller' : 'Buyer';
  const listingTitle = selectedThread?.listing?.title || 'Listing unavailable';

  return (
    <div className="page-shell">
      <Topbar />
      <main className="container ld-page">
        <nav className="ld-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span aria-hidden="true">/</span><span>Messages</span>
        </nav>
        <header className="ld-more-heading">
          <div>
            <span className="eyebrow">Direct messages</span>
            <h1>Messages</h1>
          </div>
        </header>

        <div className="ld-layout">
          <section className="ld-main">
            <section className="card ld-card" aria-label="Your conversations">
              <div className="ld-card-heading">
                <div>
                  <span className="eyebrow">Inbox</span>
                  <h2>Your conversations</h2>
                </div>
              </div>
              {threadsLoading ? (
                <p role="status">Loading conversations…</p>
              ) : threadsError ? (
                <p className="field-error" role="alert">{threadsError}</p>
              ) : threads.length ? (
                <div>
                  {threads.map((thread) => {
                    const title = thread.listing?.title || 'Listing unavailable';
                    const isSelected = thread.id === selectedThreadId;
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        className="btn btn-secondary"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedThreadId(thread.id)}
                        style={{
                          width: '100%',
                          minHeight: '64px',
                          justifyContent: 'space-between',
                          marginTop: '9px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          borderColor: isSelected ? 'var(--maroon-700)' : undefined,
                        }}
                      >
                        <span style={{ display: 'grid', textAlign: 'left' }}>
                          <strong>{title}</strong>
                          <small>{thread.buyer_id === user.id ? 'You started this chat' : 'A buyer messaged you'}</small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p>You don’t have any conversations yet.</p>
              )}
            </section>
          </section>

          <aside className="ld-sidebar">
            {selectedThread ? (
              <section className="card ld-card ld-chat-card">
                <div className="ld-card-heading">
                  <div>
                    <span className="eyebrow">{partnerLabel}</span>
                    <h2>{listingTitle}</h2>
                  </div>
                  <Link to={`/listing?id=${encodeURIComponent(selectedThread.listing_id)}`} aria-label="View listing">↗</Link>
                </div>
                <div className="ld-chat-log" aria-live="polite" aria-label={`Messages with ${partnerLabel}`}>
                  {chatLoading && <p role="status">Loading messages…</p>}
                  {chatError && <p className="field-error" role="alert">{chatError}</p>}
                  {!chatLoading && !chatError && messages.length === 0 && <p>No messages yet. Send the first one.</p>}
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === user.id;
                    return (
                      <div className={`message${isOwnMessage ? ' message-own' : ''}`} key={message.id}>
                        <span className="message-sender">{isOwnMessage ? 'You' : partnerLabel}</span>
                        <p>{message.body}</p>
                      </div>
                    );
                  })}
                </div>
                <form className="ld-chat-form" onSubmit={handleSend}>
                  <label className="sr-only" htmlFor="messages-draft">Write a message</label>
                  <input
                    id="messages-draft"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message…"
                    maxLength="1000"
                    disabled={chatLoading || sending || !threadId}
                  />
                  <button type="submit" aria-label="Send message" disabled={!draft.trim() || chatLoading || sending || !threadId}>
                    {sending ? '…' : '→'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="card ld-card">
                <span className="eyebrow">Conversation</span>
                <h2>Select a conversation</h2>
                <p>Choose a message thread to read and reply.</p>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Messages;
