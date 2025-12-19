-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar a edge function de aniversários para rodar todo dia às 8h (horário de Brasília = 11h UTC)
SELECT cron.schedule(
  'birthday-notifications-daily',
  '0 11 * * *', -- Todo dia às 11:00 UTC (8:00 BRT)
  $$
  SELECT
    net.http_post(
      url := 'https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/birthday-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZmtkZGNibXdsd2xkYW9yeHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODUzMTYsImV4cCI6MjA4MDY2MTMxNn0.NXJ12zhicB1iw3O18zxVaDX34OWa3BOEpaI2fp8B7-s"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);