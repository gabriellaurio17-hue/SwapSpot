update public.listings l
set status = 'unavailable'
where l.listing_type = 'sale'
  and l.stock = 0
  and l.status = 'available'
  and exists (
    select 1
    from public.transactions t
    where t.listing_id = l.id
  );

drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings for select to anon, authenticated
  using (
    status = 'available'
    or seller_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.transactions t
      where t.listing_id = listings.id
        and t.buyer_id = auth.uid()
    )
  );

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
  update public.listings
     set stock = stock - 1,
         status = case when stock = 1 then 'unavailable'::public.listing_status else status end
   where id = l.id;
  insert into public.transactions (listing_id, buyer_id, seller_id)
  values (l.id, auth.uid(), l.seller_id) returning id into tid;
  return tid;
end $$;
