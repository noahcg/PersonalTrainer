-- Demo seed for local Supabase. Password for both users: demo-password
-- If hosted Supabase blocks direct auth inserts, create users in Auth UI first and replace these ids.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'trainer@example.com', crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Avery Stone"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mara@example.com', crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mara Lee"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email, avatar_url)
values
  ('10000000-0000-0000-0000-000000000001', 'trainer', 'Avery Stone', 'trainer@example.com', null),
  ('10000000-0000-0000-0000-000000000002', 'client', 'Mara Lee', 'mara@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330')
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

insert into public.trainers (id, profile_id, business_name, coaching_bio)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Aurelian Coach', 'Calm, precise strength coaching for durable progress.')
on conflict (id) do nothing;

insert into public.clients (
  id, trainer_id, profile_id, full_name, email, profile_photo_url, goals, fitness_level,
  injuries_limitations, notes, preferred_training_style, availability, pricing_tier, invite_sent_at, start_date, status
)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Mara Lee', 'mara@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', 'Build confident strength, improve posture, and train for a fall half marathon.', 'Intermediate', 'Occasional right hip tightness.', 'Responds well to concise weekly priorities.', 'Strength-first, calm coaching, measurable progression.', 'Mon/Wed/Fri mornings, Sunday mobility.', 'ongoing_coaching', '2026-01-12T12:00:00Z', '2026-01-12', 'active'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', null, 'Eli Brooks', 'eli@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 'Return to pain-free lifting and rebuild work capacity.', 'Foundation', 'History of shoulder impingement.', 'Needs reminders to log RPE and sleep.', 'Technique-focused, low ego, mobility emphasis.', 'Tue/Thu evenings, Saturday morning.', 'intro_session', '2026-02-03T12:00:00Z', '2026-02-03', 'needs_attention')
on conflict (id) do nothing;

insert into public.training_plans (id, trainer_id, title, description, duration_weeks, goal, weekly_structure, notes, is_template, status)
values ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Strong & Calm 12', 'A measured strength cycle built around confidence, posture, and aerobic recovery.', 12, 'Strength foundation + consistency', '3 strength sessions, 1 mobility session, 2 low-intensity walks', 'Designed for busy clients who need precision without overwhelm.', true, 'active')
on conflict (id) do nothing;

insert into public.workouts (id, trainer_id, training_plan_id, name, phase_label, scheduled_day, warmup, cooldown, coach_notes)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Lower Strength A', 'Week 5 / Day 1', 1, '6 min incline walk, hip airplanes, dead bug breathing, bodyweight squats.', '90/90 breathing, couch stretch, easy walk until heart rate settles.', 'Stay two reps shy of failure today. Prioritize tempo and smooth bracing.')
on conflict (id) do nothing;

insert into public.workout_blocks (id, workout_id, label, intent, position)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Main Strength', 'Progressive lower-body strength with clean mechanics.', 1),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Accessory + Core', 'Build single-leg capacity and trunk control.', 2)
on conflict (id) do nothing;

insert into public.workout_exercises (workout_block_id, exercise_id, position, sets, reps, tempo, rest_time, rpe_target, load_guidance, notes)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 1, 4, '8', '3-1-1', '90s', '7', 'Last week +5 lb if warm-ups feel crisp', 'Film set 3 from front angle.'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 2, 3, '10', '3-0-1', '2 min', '7-8', 'Moderate, straps allowed', 'Stop before back position changes.')
on conflict do nothing;

insert into public.plan_assignments (training_plan_id, client_id, starts_on, ends_on, status)
values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-04-01', '2026-06-24', 'active')
on conflict do nothing;

insert into public.check_ins (client_id, energy, soreness, sleep, stress, motivation, mood, notes)
values
  ('30000000-0000-0000-0000-000000000001', 8, 3, 7, 4, 9, 'Focused', 'Legs feel fresh. Long run was easier than expected.'),
  ('30000000-0000-0000-0000-000000000002', 5, 6, 5, 8, 6, 'Flat', 'Work travel made workouts inconsistent. Shoulder is okay but tight.');

insert into public.resources (trainer_id, title, description, resource_type, url, content, tags, audience)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'Meal Prep Made Simple',
    'A practical weekly meal-prep guide that supports strength, recovery, and steady eating habits without turning food into a second job.',
    'Nutrition',
    null,
    'Meal prep works best when it lowers friction instead of trying to create perfect meals. Build each prep around three anchors: a reliable protein, an easy carbohydrate, and produce you will actually eat. Pick two proteins for the week such as chicken thighs, lean ground turkey, Greek yogurt, eggs, tofu, or salmon. Pair them with one or two easy carbs like rice, potatoes, oats, wraps, or fruit. Add vegetables that reheat well or are easy to grab cold, such as roasted broccoli, green beans, peppers, carrots, salad kits, berries, and cucumbers.

A simple rhythm is enough. Prep two to four lunch or dinner meals, keep a fast breakfast option ready, and stock one or two high-protein snacks. Aim for meals that look balanced, repeatable, and easy to assemble when the day gets busy. A useful default plate is protein first, produce second, carbs adjusted to activity, and fats kept moderate but included.

For training days, make it easier to eat around the session. Have a meal one to three hours before training with protein and carbs, and eat again after training when practical. That can be as simple as yogurt and fruit before the gym, then a rice bowl with chicken and vegetables afterward. Recovery nutrition does not need to be complicated. Consistency beats precision.

Keep the prep realistic. Use one sheet-pan meal, one pot or rice cooker carb, washed fruit, and a few repeat staples. If a full prep feels heavy, prep components instead of full containers: cooked protein, cooked starch, chopped produce, and one sauce. That still gives structure without making the week feel rigid.

A strong meal-prep week should leave you with fewer decisions, steadier energy, and less reliance on random convenience food. The goal is not clean eating perfection. The goal is making good choices easier to repeat.',
    array['nutrition','meal prep','recovery'],
    'all'
  ),
  ('20000000-0000-0000-0000-000000000001', 'Travel Week Strength Menu', 'Simple sessions for hotel gyms and busy weeks.', 'Guide', null, null, array['travel','strength'], 'all'),
  ('20000000-0000-0000-0000-000000000001', 'Hip Reset Flow', 'A short mobility flow for hip tightness.', 'Video', null, null, array['mobility','hips'], 'assigned');
