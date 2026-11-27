drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or target_user_id = auth.uid()
    or public.is_admin()
    or (
      target_listing_id is not null
      and exists (
        select 1
        from public.listings l
        where l.id = reports.target_listing_id
          and l.seller_id = auth.uid()
      )
    )
  );
