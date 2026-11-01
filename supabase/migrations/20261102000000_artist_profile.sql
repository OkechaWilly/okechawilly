-- Artist profile content managed separately from the artwork catalogue.
create table if not exists public.artist_profile (
  id integer primary key default 1 check (id = 1),
  display_name text not null default 'Okecha Willy',
  location text not null default 'Uganda',
  introduction text not null default '',
  artist_statement text not null default '',
  biography text not null default '',
  themes jsonb not null default '[]'::jsonb,
  portrait_path text,
  gallery jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.artist_profile enable row level security;
drop policy if exists "Public read published artist profile" on public.artist_profile;
create policy "Public read published artist profile"
  on public.artist_profile for select
  using (is_published or public.is_admin());
drop policy if exists "Admin manage artist profile" on public.artist_profile;
create policy "Admin manage artist profile"
  on public.artist_profile for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.artist_profile to anon, authenticated;
grant insert, update, delete on public.artist_profile to authenticated;

insert into public.artist_profile
  (id, display_name, location, introduction, artist_statement, biography, themes, portrait_path, is_published)
values
  (1, 'Okecha Willy', 'Uganda',
   'I am a Ugandan visual artist working across painting, drawing and visual storytelling. My practice explores identity, spirituality, culture, nature and the many ways we experience being human.',
   'I make work to look more closely at the things that shape our lives: the stories we inherit, the beliefs we carry, the environments we inhabit and the relationships we form with one another. I am drawn to subjects that hold more than one meaning, where the visible world can open a path toward memory, feeling or reflection.

I approach painting and image-making as forms of inquiry. A church, a portrait, a landscape or an everyday object can become a starting point for thinking about belonging, power, faith, change and the passage of time. I want the work to remain open enough for viewers to bring their own experiences to it.

Working from Uganda, I draw from the textures and complexities of the world around me while remaining curious about the connections between local stories and wider human experience.',
   'My relationship with art began in childhood, making and experimenting alongside my four brothers. I returned to a more deliberate visual-art practice in 2019, while completing a Computer Science degree at Ndejje University.

That meeting of creative practice and technology continues to inform how I think about images, process and communication. It has also kept me curious about the possibilities of different materials and ways of telling stories.

My current painting direction includes an ongoing exploration of religion and its place in society, with particular attention to churches, church leaders and portraiture.',
   '[{"title":"Memory & identity","description":"I am interested in the ways personal and collective histories shape how we understand ourselves and the places we belong to."},{"title":"Faith & the everyday","description":"I explore the presence of belief in ordinary life — through places of worship, people, symbols, rituals and the questions they leave behind."},{"title":"Nature & our environment","description":"The natural world is both subject and context: a source of form, material, reflection and questions about our relationship with the earth."}]'::jsonb,
   '3732b0e8-e117-46b0-86ae-7158784b9d09/ff7cffa7-c05a-42cd-ade6-1402b1260a09.png',
   true)
on conflict (id) do nothing;
