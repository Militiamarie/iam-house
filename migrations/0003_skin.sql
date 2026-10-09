create table if not exists house_skin (
  id text primary key,
  skin text not null
);

insert into house_skin (id, skin) values ('house', 'house')
on conflict (id) do nothing;
