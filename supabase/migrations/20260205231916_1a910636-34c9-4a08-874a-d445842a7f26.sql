-- Criar convite de teste vinculando Joao da Silva a Diogo Devitte
INSERT INTO invitations (code, invited_by, name, email, status, accepted_by, accepted_at, expires_at)
VALUES (
  'TESTCONV',
  'bf758ced-f647-4e93-ace6-39167cc571a4', -- Diogo Devitte
  'Joao da Silva',
  NULL,
  'accepted',
  '4e037fb7-fd01-42c3-a7d3-6affc196ad55', -- Joao da Silva user_id
  now(),
  now() + interval '30 days'
);

-- Marcar convites expirados como status 'expired'
UPDATE invitations 
SET status = 'expired' 
WHERE status = 'pending' 
  AND expires_at < now();