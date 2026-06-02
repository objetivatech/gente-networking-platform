DO $$
DECLARE
  _uid uuid := '6ca0b5eb-1333-4e9c-9870-b80582487d06';
  _mid uuid := '578f6361-0b11-4396-8c5f-a7f76b64d898';
  existed boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM attendances WHERE meeting_id=_mid AND user_id=_uid) INTO existed;
  IF existed THEN RAISE NOTICE 'already attending, skipping'; RETURN; END IF;
  INSERT INTO attendances (meeting_id, user_id) VALUES (_mid, _uid);
  RAISE NOTICE 'INSERT + triggers OK';
  DELETE FROM attendances WHERE meeting_id=_mid AND user_id=_uid;
  RAISE NOTICE 'DELETE + triggers OK';
END $$;