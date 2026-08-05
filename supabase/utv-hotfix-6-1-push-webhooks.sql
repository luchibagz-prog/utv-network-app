create extension if not exists pg_net with schema extensions;

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.feed_comments;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.feed_comment_reactions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.feed_likes;
  exception when duplicate_object then null;
  end;
end
$$;

drop trigger if exists utv_push_messages on public.messages;
drop trigger if exists utv_push_notifications on public.notifications;
drop trigger if exists utv_push_feed_comments on public.feed_comments;
drop trigger if exists utv_push_feed_comment_reactions on public.feed_comment_reactions;

create trigger utv_push_messages
after insert on public.messages
for each row execute function supabase_functions.http_request(
  'https://utv-network-app-cdfd.vercel.app/api/push/webhook',
  'POST',
  '{"Content-Type":"application/json","x-utv-webhook-secret":"c446bef1e19dd47236b69771703fdf9daef9925224729fc7"}',
  '{}',
  '5000'
);

create trigger utv_push_notifications
after insert on public.notifications
for each row execute function supabase_functions.http_request(
  'https://utv-network-app-cdfd.vercel.app/api/push/webhook',
  'POST',
  '{"Content-Type":"application/json","x-utv-webhook-secret":"c446bef1e19dd47236b69771703fdf9daef9925224729fc7"}',
  '{}',
  '5000'
);

create trigger utv_push_feed_comments
after insert on public.feed_comments
for each row execute function supabase_functions.http_request(
  'https://utv-network-app-cdfd.vercel.app/api/push/webhook',
  'POST',
  '{"Content-Type":"application/json","x-utv-webhook-secret":"c446bef1e19dd47236b69771703fdf9daef9925224729fc7"}',
  '{}',
  '5000'
);

create trigger utv_push_feed_comment_reactions
after insert on public.feed_comment_reactions
for each row execute function supabase_functions.http_request(
  'https://utv-network-app-cdfd.vercel.app/api/push/webhook',
  'POST',
  '{"Content-Type":"application/json","x-utv-webhook-secret":"c446bef1e19dd47236b69771703fdf9daef9925224729fc7"}',
  '{}',
  '5000'
);
