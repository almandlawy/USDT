-- pgcrypto is installed in Supabase's `extensions` schema. The rate-limit
-- function uses a restricted search_path, so the digest call must be qualified.
create or replace function public.check_rate_limit(input_key text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz;
  current_hits integer;
begin
  if max_hits < 1 or window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  bucket := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.rate_limit_events (key_hash, window_start, hits)
  values (encode(extensions.digest(input_key, 'sha256'), 'hex'), bucket, 1)
  on conflict (key_hash, window_start)
  do update set hits = public.rate_limit_events.hits + 1
  returning hits into current_hits;

  return current_hits <= max_hits;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
