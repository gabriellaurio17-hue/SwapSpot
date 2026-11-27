import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useListings({ q, category, maxPrice }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    setLoading(true);
    setError(null);

    async function fetchListings() {
      try {
        let query = supabase
          .from('listings')
          .select('*')
          .eq('status', 'available')
          .order('created_at', { ascending: false });

        if (q) {
          query = query.ilike('title', `%${q}%`);
        }
        if (category && category !== 'All') {
          query = query.eq('category', category);
        }
        if (maxPrice != null) {
          query = query.lte('price', maxPrice);
        }

        const { data, error: supabaseError } = await query;

        if (cancelRef.current) return;

        if (supabaseError) {
          setError(supabaseError.message);
          setListings([]);
        } else {
          setListings(data || []);
        }
      } catch (err) {
        if (cancelRef.current) return;
        setError(err.message || 'Failed to load listings');
        setListings([]);
      } finally {
        if (!cancelRef.current) setLoading(false);
      }
    }

    fetchListings();

    return () => {
      cancelRef.current = true;
    };
  }, [q, category, maxPrice]);

  return { listings, loading, error };
}