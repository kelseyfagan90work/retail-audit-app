-- Retail Audit App — Supabase (Postgres) schema
-- Run this once in your Supabase project's SQL editor.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'auditor')),
  created_at timestamptz not null default now()
);

create table stores (
  id serial primary key,
  store_number text not null unique,
  store_name text not null,
  region text,                        -- broader grouping, e.g. "Northeast"
  district_manager text not null,     -- the DM's name — this is what your team calls "district"
  district_manager_email text,
  store_email text,                   -- report emails go to this + district_manager_email, whichever are set
  is_active boolean not null default true
);

-- The master, editable template. Editing this never changes past audits —
-- see audit_sections/audit_questions below, which snapshot the template at
-- the moment an audit is started.
create table audit_templates (
  id serial primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table template_sections (
  id serial primary key,
  template_id int not null references audit_templates(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table template_questions (
  id serial primary key,
  section_id int not null references template_sections(id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- One row per audit visit.
create table audits (
  id serial primary key,
  store_id int not null references stores(id),
  template_id int references audit_templates(id),  -- kept for reference; nullable in case the template is later deleted
  template_name text not null,                       -- snapshot, so the audit still shows a name even if the template is renamed/deleted
  auditor_email text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  overall_score numeric,                              -- percentage, 0-100, filled in on completion
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  report_sent_at timestamptz
);

-- Snapshot of the template's sections/questions as they were when this
-- specific audit started — this is what makes editing the master template
-- safe without disturbing history.
create table audit_sections (
  id serial primary key,
  audit_id int not null references audits(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table audit_questions (
  id serial primary key,
  audit_id int not null references audits(id) on delete cascade,
  audit_section_id int not null references audit_sections(id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  answer text check (answer in ('yes', 'no', 'n_a')),  -- null until answered
  note text
);

create table audit_photos (
  id serial primary key,
  audit_question_id int not null references audit_questions(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

-- Tasks an admin assigns to a specific auditor — shows up on that person's
-- dashboard. Optionally linked to a store and/or a specific audit for context.
create table tasks (
  id serial primary key,
  title text not null,
  description text,
  store_id int references stores(id),
  audit_id int references audits(id),
  assigned_to_email text not null,
  assigned_by_email text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index on stores (district_manager);
create index on stores (region);
create index on template_sections (template_id);
create index on template_questions (section_id);
create index on audits (store_id);
create index on audits (status);
create index on audits (started_at);
create index on audit_sections (audit_id);
create index on audit_questions (audit_id);
create index on audit_photos (audit_question_id);
create index on tasks (assigned_to_email);
create index on tasks (status);

-- Row Level Security: the app's API routes use the service-role key (which
-- bypasses RLS) and do their own role checks in code, so these policies are
-- a backstop against the anon/public key ever touching these tables
-- directly — not the primary access control.
alter table profiles enable row level security;
alter table stores enable row level security;
alter table audit_templates enable row level security;
alter table template_sections enable row level security;
alter table template_questions enable row level security;
alter table audits enable row level security;
alter table audit_sections enable row level security;
alter table audit_questions enable row level security;
alter table audit_photos enable row level security;
alter table tasks enable row level security;

create policy "users can read their own profile" on profiles
  for select using (auth.uid() = id);

-- No policies granting anon/authenticated access to the rest — default deny.
-- All real access goes through the Next.js API routes using the service-role key.

-- Seed example data once you've created your Supabase auth users (see README):
-- insert into stores (store_number, store_name, region, district_manager, district_manager_email, store_email)
--   values ('0142', 'Main St', 'Northeast', 'Jamie Rivera', 'jamie@example.com', 'store142@example.com');
--
-- insert into audit_templates (name, description) values ('Monthly Store Standards', 'Standard monthly walkthrough');
-- insert into template_sections (template_id, name, sort_order) values (1, 'Front of Store', 0);
-- insert into template_questions (section_id, text, sort_order) values
--   (1, 'Windows and entryway are clean and free of clutter', 0),
--   (1, 'Current promotional signage is displayed correctly', 1);
