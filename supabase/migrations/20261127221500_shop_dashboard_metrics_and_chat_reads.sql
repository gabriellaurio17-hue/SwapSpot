alter table public.transactions
  add column if not exists amount numeric(10, 2),
  add column if not exists paid_at timestamptz;

update public.transactions t
set amount = l.price
from public.listings l
where l.id = t.listing_id
  and t.amount is null;

alter table public.transactions
  alter column amount set default 0,
  alter column amount set not null;

update public.transactions
set paid_at = created_at
where payment_status = 'paid'
  and paid_at is null;

create or replace function public.set_transaction_dashboard_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select l.price
      into new.amount
      from public.listings l
     where l.id = new.listing_id;
    if not found then
      raise exception 'Transaction listing was not found';
    end if;
  elsif new.listing_id is distinct from old.listing_id then
    select l.price
      into new.amount
      from public.listings l
     where l.id = new.listing_id;
    if not found then
      raise exception 'Transaction listing was not found';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.payment_status = 'paid' then
      new.paid_at := coalesce(new.paid_at, now());
    end if;
  elsif new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    new.paid_at := now();
  elsif new.payment_status <> 'paid' then
    new.paid_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_dashboard_fields on public.transactions;
create trigger transactions_dashboard_fields
before insert or update of listing_id, payment_status
on public.transactions
for each row execute function public.set_transaction_dashboard_fields();

alter table public.chat_threads
  add column if not exists seller_last_read_at timestamptz,
  add column if not exists buyer_last_read_at timestamptz,
  add column if not exists last_message_at timestamptz;

update public.chat_threads t
set last_message_at = coalesce(
  (select max(m.sent_at) from public.chat_messages m where m.thread_id = t.id),
  t.created_at
)
where t.last_message_at is null;

create or replace function public.touch_chat_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads
     set last_message_at = new.sent_at
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_thread on public.chat_messages;
create trigger chat_messages_touch_thread
after insert on public.chat_messages
for each row execute function public.touch_chat_thread_activity();

create or replace function public.mark_chat_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads t
     set seller_last_read_at = case
           when t.seller_id = auth.uid() then now()
           else t.seller_last_read_at
         end,
         buyer_last_read_at = case
           when t.buyer_id = auth.uid() then now()
           else t.buyer_last_read_at
         end
   where t.id = p_thread_id
     and auth.uid() in (t.buyer_id, t.seller_id);

  if not found then
    raise exception 'Conversation not found or access denied';
  end if;
end;
$$;

revoke all on function public.mark_chat_thread_read(uuid) from public;
grant execute on function public.mark_chat_thread_read(uuid) to authenticated;

create or replace function public.shop_owner_unread_chat_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct t.id)::integer
    from public.chat_threads t
   where t.seller_id = auth.uid()
     and exists (
       select 1
         from public.chat_messages m
        where m.thread_id = t.id
          and m.sender_id <> auth.uid()
          and m.sent_at > coalesce(t.seller_last_read_at, t.created_at)
     );
$$;

revoke all on function public.shop_owner_unread_chat_count() from public;
grant execute on function public.shop_owner_unread_chat_count() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['listings', 'transactions', 'chat_threads']
  loop
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
