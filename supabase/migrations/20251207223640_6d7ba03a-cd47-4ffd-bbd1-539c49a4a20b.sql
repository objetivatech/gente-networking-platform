-- Update the existing invitation that should have been accepted
-- The user diogodevitte@outlook.com (id: 4a4787a6-67e6-4097-ba10-d1cde9496c2a) used invitation code XBND8QD3
UPDATE invitations 
SET 
  status = 'accepted',
  accepted_by = '4a4787a6-67e6-4097-ba10-d1cde9496c2a',
  accepted_at = '2025-12-07 22:09:25.400547+00'
WHERE code = 'XBND8QD3' AND status = 'pending';