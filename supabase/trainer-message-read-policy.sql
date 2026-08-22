drop policy if exists "messages trainers mark client messages read" on public.messages;

create policy "messages trainers mark client messages read"
on public.messages
for update
using (
  trainer_id = public.current_trainer_id()
  and kind = 'message'
  and sender_profile_id is distinct from auth.uid()
)
with check (
  trainer_id = public.current_trainer_id()
  and kind = 'message'
  and sender_profile_id is distinct from auth.uid()
);
