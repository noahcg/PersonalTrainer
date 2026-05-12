insert into public.exercises (id, name, category, muscle_groups, equipment, movement_pattern, difficulty, instructions, coaching_cues, mistakes_to_avoid, substitutions, demo_url, is_global)
values
  ('00000000-0000-0000-0000-000000000201', 'World''s Greatest Stretch', 'Warm Up', array['Hips','Hamstrings','T-Spine'], array['Mat'], 'Mobility', 'beginner', 'Step into a long lunge, place both hands inside the front foot, rotate the chest toward the front leg, then switch sides.', array['Long spine','Back leg active','Rotate through the upper back'], array['Rushing the rotation','Letting the front knee collapse','Holding breath'], array['Half-kneeling hip flexor stretch','Runner lunge reach','T-spine open book'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true),
  ('00000000-0000-0000-0000-000000000202', 'Glute Bridge March', 'Warm Up', array['Glutes','Hamstrings','Core'], array['Mat'], 'Activation', 'beginner', 'Hold a bridge position, keep ribs down, and alternate lifting one knee without letting the pelvis shift.', array['Level hips','Push through the heel','Quiet ribs'], array['Overarching the back','Dropping the hips','Moving too fast'], array['Glute bridge hold','Mini-band bridge','Dead bug'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true),
  ('00000000-0000-0000-0000-000000000203', 'Cat-Cow to T-Spine Reach', 'Warm Up', array['T-Spine','Shoulders','Core'], array['Mat'], 'Mobility', 'beginner', 'Move through a controlled cat-cow, then thread one arm under the body and rotate open toward the ceiling.', array['Move segment by segment','Exhale into the reach','Keep hips stacked over knees'], array['Forcing range','Shrugging','Shifting hips side to side'], array['Open book rotation','Quadruped reach','Child''s pose reach'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true),
  ('00000000-0000-0000-0000-000000000204', 'Couch Stretch Breathing', 'Cool Down', array['Hip Flexors','Quads'], array['Bench','Wall'], 'Stretch', 'beginner', 'Set the back knee near a wall or bench, tuck the pelvis gently, and breathe slowly while keeping the ribs stacked.', array['Glute lightly on','Slow nasal inhale','Long exhale'], array['Arching the low back','Forcing the knee angle','Holding breath'], array['Half-kneeling hip flexor stretch','Side-lying quad stretch','90/90 hip switch'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true),
  ('00000000-0000-0000-0000-000000000205', 'Child''s Pose Lat Reach', 'Cool Down', array['Lats','T-Spine','Shoulders'], array['Mat'], 'Stretch', 'beginner', 'Sit hips back, walk both hands to one side, and breathe into the outside ribs before switching sides.', array['Heavy hips','Reach long','Breathe into the side body'], array['Shrugging','Collapsing through the shoulders','Rushing the hold'], array['Bench lat stretch','Open book rotation','Thread the needle'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true),
  ('00000000-0000-0000-0000-000000000206', 'Supine Hamstring Floss', 'Cool Down', array['Hamstrings','Calves'], array['Strap','Mat'], 'Mobility', 'beginner', 'Lie on your back, hold one leg with a strap or hands, and slowly bend and straighten the knee through a comfortable range.', array['Keep pelvis heavy','Move smoothly','Stop before nerve tension'], array['Pulling aggressively','Locking the knee hard','Lifting the hips'], array['Wall hamstring stretch','Calf stretch','90/90 breathing'], 'https://images.unsplash.com/photo-1518611012118-696072aa579a', true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  muscle_groups = excluded.muscle_groups,
  equipment = excluded.equipment,
  movement_pattern = excluded.movement_pattern,
  difficulty = excluded.difficulty,
  instructions = excluded.instructions,
  coaching_cues = excluded.coaching_cues,
  mistakes_to_avoid = excluded.mistakes_to_avoid,
  substitutions = excluded.substitutions,
  demo_url = excluded.demo_url,
  is_global = excluded.is_global;
