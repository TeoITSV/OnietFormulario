-- Pegá esto entero en el SQL Editor de Neon (o de la base que uses) una sola vez.

create table if not exists postulacion (
  id          bigserial primary key,
  nombre      text not null,
  curso       text not null,
  email       text not null unique,
  tel         text,
  modalidad   text,
  experiencia text,
  estado      text not null default 'postulado',
  creado      timestamptz not null default now()
);

create table if not exists postulacion_competencia (
  postulacion_id bigint not null references postulacion(id) on delete cascade,
  competencia    text   not null,
  orden          int    not null,
  primary key (postulacion_id, competencia)
);

create index if not exists idx_pc_competencia on postulacion_competencia (competencia);

create table if not exists configuracion (
  id           int primary key,
  valor        jsonb not null,
  actualizado  timestamptz not null default now()
);
