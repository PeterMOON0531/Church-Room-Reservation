-- Shared church calendar: all authenticated users can see active bookings
-- (approved / pending / completed). Own rows and elevated roles still see all
-- of their scoped rows. Developer is treated like admin for reservation access.

drop policy if exists reservations_select_own_or_elevated on public.reservations;
create policy reservations_select_own_or_elevated
  on public.reservations
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'developer')
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
    or status in ('approved', 'pending', 'completed')
  );

drop policy if exists reservations_update_own_or_approver on public.reservations;
create policy reservations_update_own_or_approver
  on public.reservations
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'developer')
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
  )
  with check (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'developer')
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
  );

drop policy if exists reservations_delete_own_or_admin on public.reservations;
create policy reservations_delete_own_or_admin
  on public.reservations
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'developer')
  );

comment on policy reservations_select_own_or_elevated on public.reservations is
  'Own rows; admin/developer all; dept head same dept; everyone can read approved/pending/completed for shared calendar';
