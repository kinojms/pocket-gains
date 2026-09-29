-- Customizable pet colour (preset palettes).
alter table public.profile
  add column pet_color text not null default 'mint'
  check (pet_color in ('mint', 'peach', 'lavender', 'sky', 'lemon', 'rose'));
