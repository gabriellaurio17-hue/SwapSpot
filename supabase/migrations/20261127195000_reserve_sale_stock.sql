create or replace function public.start_transaction(p_listing uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.listings; tid uuid;
begin
  if not public.is_active() then raise exception 'Account is not active'; end if;
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status <> 'available' or l.listing_type <> 'sale' or l.stock <= 0 then
    raise exception 'Listing is not available for sale or is out of stock';
  end if;
  if l.seller_id = auth.uid() then raise exception 'You cannot buy your own listing'; end if;
  update public.listings set stock = stock - 1 where id = l.id;
  insert into public.transactions (listing_id, buyer_id, seller_id)
  values (l.id, auth.uid(), l.seller_id) returning id into tid;
  return tid;
end $$;
