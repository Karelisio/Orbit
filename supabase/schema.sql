-- ============================================================================
-- Orbit — schéma Supabase (Postgres)
-- Orbit partage EXACTEMENT le même projet Supabase que l'app "Wenn" : ce
-- fichier ne redéfinit ni "profiles", ni "couples", ni "cycle_days" (déjà
-- créées par supabase/schema.sql de Wenn) — il ajoute uniquement les tables
-- propres à Orbit (calendrier, tâches, budget, journal) et une colonne sur
-- "couples" pour le compteur "jours ensemble".
--
-- À exécuter dans le SQL Editor du projet Supabase partagé, une fois, sur un
-- projet où le schéma de Wenn existe déjà. Les évolutions suivantes de ce
-- fichier s'ajoutent en fin de fichier comme blocs additifs (voir CLAUDE.md
-- de Wenn pour la convention : jamais rejouer tout le fichier).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- couples : compteur "jours ensemble" (colonne additive, Wenn ne la lit pas)
-- ---------------------------------------------------------------------------
alter table public.couples
  add column if not exists together_since date;

-- ---------------------------------------------------------------------------
-- events : événements de calendrier partagés
-- ---------------------------------------------------------------------------
create table if not exists public.orbit_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  description text,
  location text,
  -- Texte libre (nom d'une ligne de orbit_event_categories), pas un enum figé :
  -- le couple peut créer ses propres catégories au fil de l'eau.
  category text not null default 'Autre',
  color text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  reminder_minutes_before integer[] not null default '{}',
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orbit_events_couple_starts_idx on public.orbit_events (couple_id, starts_at);

alter table public.orbit_events enable row level security;

create policy "orbit_events: select member"
  on public.orbit_events for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_events.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_events: member write"
  on public.orbit_events for all
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_events.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

drop trigger if exists orbit_events_set_updated_at on public.orbit_events;
create trigger orbit_events_set_updated_at
  before update on public.orbit_events
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orbit_event_categories : catégories d'événements, créées librement par le
-- couple (remplace l'ancien enum figé de orbit_events.category)
-- ---------------------------------------------------------------------------
create table if not exists public.orbit_event_categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (couple_id, name)
);

alter table public.orbit_event_categories enable row level security;

create policy "orbit_event_categories: select member"
  on public.orbit_event_categories for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_event_categories.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_event_categories: member write"
  on public.orbit_event_categories for all
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_event_categories.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- orbit_tasks : tâches / to-do partagées
-- ---------------------------------------------------------------------------
create table if not exists public.orbit_tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  notes text,
  assigned_to uuid references auth.users (id) on delete set null,
  due_date date,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  -- Ex. recurrence='weekly' + recurrence_interval=2 -> toutes les 2 semaines.
  recurrence_interval integer not null default 1 check (recurrence_interval >= 1),
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orbit_tasks_couple_idx on public.orbit_tasks (couple_id, done, created_at);

alter table public.orbit_tasks enable row level security;

create policy "orbit_tasks: select member"
  on public.orbit_tasks for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_tasks.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_tasks: member write"
  on public.orbit_tasks for all
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_tasks.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

drop trigger if exists orbit_tasks_set_updated_at on public.orbit_tasks;
create trigger orbit_tasks_set_updated_at
  before update on public.orbit_tasks
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orbit_journal_entries : notes / souvenirs partagés, horodatés et attribués
-- ---------------------------------------------------------------------------
create table if not exists public.orbit_journal_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orbit_journal_couple_idx on public.orbit_journal_entries (couple_id, created_at);

alter table public.orbit_journal_entries enable row level security;

create policy "orbit_journal_entries: select member"
  on public.orbit_journal_entries for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_journal_entries.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_journal_entries: member insert"
  on public.orbit_journal_entries for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_journal_entries: author update"
  on public.orbit_journal_entries for update
  using (author_id = auth.uid());

create policy "orbit_journal_entries: author delete"
  on public.orbit_journal_entries for delete
  using (author_id = auth.uid());

drop trigger if exists orbit_journal_set_updated_at on public.orbit_journal_entries;
create trigger orbit_journal_set_updated_at
  before update on public.orbit_journal_entries
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orbit_expenses : dépenses communes (qui a payé, catégorie, montant)
-- ---------------------------------------------------------------------------
create table if not exists public.orbit_expenses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  category text not null default 'autre',
  paid_by uuid not null references auth.users (id),
  spent_at date not null default current_date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists orbit_expenses_couple_idx on public.orbit_expenses (couple_id, spent_at);

alter table public.orbit_expenses enable row level security;

create policy "orbit_expenses: select member"
  on public.orbit_expenses for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_expenses.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

create policy "orbit_expenses: member write"
  on public.orbit_expenses for all
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_expenses.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime : activer la réplication sur les tables Orbit
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orbit_events;
alter publication supabase_realtime add table public.orbit_event_categories;
alter publication supabase_realtime add table public.orbit_tasks;
alter publication supabase_realtime add table public.orbit_journal_entries;
alter publication supabase_realtime add table public.orbit_expenses;

-- ---------------------------------------------------------------------------
-- Migration additive : date d'échéance + récurrence des tâches
-- (à exécuter une fois dans le SQL Editor si le projet existe déjà)
-- ---------------------------------------------------------------------------
alter table public.orbit_tasks
  add column if not exists due_date date;
alter table public.orbit_tasks
  add column if not exists recurrence text not null default 'none';
alter table public.orbit_tasks
  drop constraint if exists orbit_tasks_recurrence_check;
alter table public.orbit_tasks
  add constraint orbit_tasks_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

-- ---------------------------------------------------------------------------
-- Migration additive : intervalle de récurrence des tâches, catégories
-- d'événements libres (au lieu d'un enum figé), assignation des événements
-- (à exécuter une fois dans le SQL Editor si le projet existe déjà)
-- ---------------------------------------------------------------------------
alter table public.orbit_tasks
  add column if not exists recurrence_interval integer not null default 1;
alter table public.orbit_tasks
  drop constraint if exists orbit_tasks_recurrence_interval_check;
alter table public.orbit_tasks
  add constraint orbit_tasks_recurrence_interval_check check (recurrence_interval >= 1);

alter table public.orbit_events
  add column if not exists assigned_to uuid references auth.users (id) on delete set null;

alter table public.orbit_events
  drop constraint if exists orbit_events_category_check;
alter table public.orbit_events
  alter column category set default 'Autre';

create table if not exists public.orbit_event_categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (couple_id, name)
);

alter table public.orbit_event_categories enable row level security;

drop policy if exists "orbit_event_categories: select member" on public.orbit_event_categories;
create policy "orbit_event_categories: select member"
  on public.orbit_event_categories for select
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_event_categories.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

drop policy if exists "orbit_event_categories: member write" on public.orbit_event_categories;
create policy "orbit_event_categories: member write"
  on public.orbit_event_categories for all
  using (
    exists (
      select 1 from public.couples c
      where c.id = orbit_event_categories.couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.couples c
      where c.id = couple_id
        and (c.owner_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.orbit_event_categories;

-- Fige la couleur des événements déjà créés (jusqu'ici toujours color=null,
-- la couleur venait de l'enum de catégorie côté client) avant que ce mapping
-- ne disparaisse avec le renommage ci-dessous.
update public.orbit_events set color = coalesce(color, '#6750a4') where category = 'rdv';
update public.orbit_events set color = coalesce(color, '#b3261e') where category = 'anniversaire';
update public.orbit_events set color = coalesce(color, '#386a20') where category = 'sortie';
update public.orbit_events set color = coalesce(color, '#0061a4') where category = 'voyage';
update public.orbit_events set color = coalesce(color, '#79747e') where category = 'autre';

-- Reprend les anciennes clés d'enum stockées sur les événements existants
-- vers les libellés lisibles désormais utilisés comme noms de catégorie.
update public.orbit_events set category = 'Rendez-vous' where category = 'rdv';
update public.orbit_events set category = 'Anniversaire' where category = 'anniversaire';
update public.orbit_events set category = 'Sortie' where category = 'sortie';
update public.orbit_events set category = 'Voyage' where category = 'voyage';
update public.orbit_events set category = 'Autre' where category = 'autre';

-- Sème les 5 catégories par défaut pour chaque couple existant qui n'en a
-- encore aucune (les nouveaux couples les reçoivent depuis l'app, voir
-- useEventCategories.ts).
insert into public.orbit_event_categories (couple_id, name, color)
select c.id, cat.name, cat.color
from public.couples c
cross join (
  values
    ('Rendez-vous', '#6750a4'),
    ('Anniversaire', '#b3261e'),
    ('Sortie', '#386a20'),
    ('Voyage', '#0061a4'),
    ('Autre', '#79747e')
) as cat(name, color)
where not exists (
  select 1 from public.orbit_event_categories oc where oc.couple_id = c.id
)
on conflict (couple_id, name) do nothing;
