-- Pegá esto entero en el SQL Editor de Neon (o de la base que uses) una sola vez.

create table if not exists postulacion (
  id          bigserial primary key,
  nombre      text not null,
  curso       text not null,
  email       text not null unique,
  tel         text,
  especialidad text,
  experiencia text,
  estado      text not null default 'postulado',
  creado      timestamptz not null default now(),
  dni         text
);

-- si la tabla ya existía sin la columna "dni", la agregamos.
alter table postulacion add column if not exists dni text;

-- si la tabla ya existía con la columna vieja "modalidad" (todos iban del
-- ITS Villada de la misma forma), la renombramos: ahora el alumno carga
-- su especialidad (Electromecánica / Programación / Electrónica / Primer Ciclo).
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'postulacion' and column_name = 'modalidad')
     and not exists (select 1 from information_schema.columns where table_name = 'postulacion' and column_name = 'especialidad') then
    alter table postulacion rename column modalidad to especialidad;
  end if;
end $$;

create table if not exists postulacion_competencia (
  postulacion_id bigint not null references postulacion(id) on delete cascade,
  competencia    text   not null,
  orden          int    not null,
  grupo          int,
  primary key (postulacion_id, competencia)
);

-- si la tabla ya existía sin la columna "grupo" (grupo 1, 2... dentro de
-- una competencia por equipo), la agregamos.
alter table postulacion_competencia add column if not exists grupo int;

create index if not exists idx_pc_competencia on postulacion_competencia (competencia);

create table if not exists configuracion (
  id           int primary key,
  valor        jsonb not null,
  actualizado  timestamptz not null default now()
);
