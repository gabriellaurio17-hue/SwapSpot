import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

function mergeMessages(current, incoming) {
  const messagesById = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => messagesById.set(message.id, message));
  return Array.from(messagesById.values())
    .sort((left, right) => left.sent_at.localeCompare(right.sent_at));
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export default function useChat(listingId, sellerId, existingThreadId = null) {
  const { user } = useAuth();
  const userId = user?.id;
  const activeThreadId = useRef(null);
  const sendGeneration = useRef(0);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let channel = null;
    activeThreadId.current = null;
    sendGeneration.current += 1;
    setThreadId(null);
    setMessages([]);
    setError('');
    setSending(false);

    if (!userId || !listingId || !sellerId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    async function findBuyerThread() {
      const { data, error: queryError } = await supabase
        .from('chat_threads')
        .select('id, listing_id, buyer_id, seller_id')
        .eq('listing_id', listingId)
        .eq('buyer_id', userId)
        .maybeSingle();

      if (queryError) throw queryError;
      return data;
    }

    async function resolveThread() {
      if (existingThreadId) {
        const { data, error: queryError } = await supabase
          .from('chat_threads')
          .select('id, listing_id, buyer_id, seller_id')
          .eq('id', existingThreadId)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) throw new Error('Conversation not found.');
        if (
          data.listing_id !== listingId
          || data.seller_id !== sellerId
          || ![data.buyer_id, data.seller_id].includes(userId)
        ) {
          throw new Error('You do not have access to this conversation.');
        }
        return data;
      }

      const existing = await findBuyerThread();
      if (existing) return existing;

      const { data, error: insertError } = await supabase
        .from('chat_threads')
        .insert({ listing_id: listingId, buyer_id: userId, seller_id: sellerId })
        .select('id, listing_id, buyer_id, seller_id')
        .single();

      if (!insertError) {
        if (!data) throw new Error('Could not create the conversation.');
        return data;
      }

      if (insertError.code !== '23505') throw insertError;

      const racedThread = await findBuyerThread();
      if (!racedThread) throw insertError;
      return racedThread;
    }

    async function loadConversation() {
      try {
        const thread = await resolveThread();
        if (cancelled) return;

        activeThreadId.current = thread.id;
        setThreadId(thread.id);
        channel = supabase
          .channel(`thread-${thread.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `thread_id=eq.${thread.id}`,
            },
            (payload) => {
              if (!cancelled && payload.new) {
                setMessages((current) => mergeMessages(current, [payload.new]));
              }
            }
          )
          .subscribe((status, subscriptionError) => {
            if (!cancelled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
              setError(getErrorMessage(subscriptionError, 'Could not connect to this conversation.'));
            }
          });

        const { data, error: messageError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('thread_id', thread.id)
          .order('sent_at', { ascending: true });

        if (messageError) throw messageError;
        if (cancelled) return;
        setMessages((current) => mergeMessages(current, data || []));
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError, 'Could not load this conversation.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConversation();

    return () => {
      cancelled = true;
      activeThreadId.current = null;
      sendGeneration.current += 1;
      if (channel) {
        supabase.removeChannel(channel).then((status) => {
          if (status !== 'ok') console.error('Failed to remove chat channel:', status);
        }).catch((error) => console.error('Failed to remove chat channel:', error));
      }
    };
  }, [existingThreadId, listingId, sellerId, userId]);

  const sendMessage = useCallback(async (body) => {
    const trimmedBody = String(body ?? '').trim();
    const length = Array.from(trimmedBody).length;
    if (length < 1 || length > 1000) {
      setError('Messages must be between 1 and 1000 characters.');
      return false;
    }
    if (!threadId || !userId) {
      setError('The conversation is not ready yet.');
      return false;
    }

    const requestGeneration = sendGeneration.current + 1;
    sendGeneration.current = requestGeneration;
    const requestedThreadId = threadId;
    setSending(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({ thread_id: requestedThreadId, sender_id: userId, body: trimmedBody })
        .select('*')
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('The message was not returned after sending.');
      if (sendGeneration.current !== requestGeneration || activeThreadId.current !== requestedThreadId) return false;
      setMessages((current) => mergeMessages(current, [data]));
      return true;
    } catch (sendError) {
      if (sendGeneration.current === requestGeneration) {
        setError(getErrorMessage(sendError, 'Could not send this message.'));
      }
      return false;
    } finally {
      if (sendGeneration.current === requestGeneration) setSending(false);
    }
  }, [threadId, userId]);

  return { threadId, messages, loading, sending, error, sendMessage };
}
