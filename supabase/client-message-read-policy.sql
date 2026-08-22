drop policy if exists "messages clients mark trainer messages read" on public.messages;

create policy "messages clients mark trainer messages read"
on public.messages
for update
using (
  client_id = public.current_client_id()
  and kind = 'message'
  and sender_profile_id is distinct from auth.uid()
)
with check (
  client_id = public.current_client_id()
  and kind = 'message'
  and sender_profile_id is distinct from auth.uid()
);
