create extension if not exists postgis;

create table spots (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('smoking', 'shop', 'shisha', 'cigar', 'cafe', 'bar')),
  lat double precision not null,
  lng double precision not null,
  address text,
  is_outdoor boolean default true,
  is_heated boolean default false,
  is_24h boolean default false,
  hours text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table checkins (
  id uuid default gen_random_uuid() primary key,
  spot_id uuid references spots(id) on delete cascade,
  user_id uuid,
  created_at timestamptz default now()
);

create table brands (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  maker text,
  category text check (category in ('cigarette', 'heated', 'shisha', 'cigar', 'other')),
  tar integer,
  nicotine double precision,
  price integer,
  availability text check (availability in ('everywhere', 'limited', 'specialty')),
  image_url text,
  created_at timestamptz default now()
);

create index spots_location on spots using gist (
  st_point(lng, lat)
);
