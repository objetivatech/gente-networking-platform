DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.meeting_requests_notify_feed()'::regprocedure) INTO d;
  d := replace(d, 'PERFORM add_activity_feed(NEW.recipient_id,', 'INSERT INTO activity_feed(user_id, activity_type, title, description, reference_id, metadata, team_id) VALUES (NEW.recipient_id,');
  d := replace(d, 'PERFORM add_activity_feed(NEW.requester_id,', 'INSERT INTO activity_feed(user_id, activity_type, title, description, reference_id, metadata, team_id) VALUES (NEW.requester_id,');
  EXECUTE d;
END $$;