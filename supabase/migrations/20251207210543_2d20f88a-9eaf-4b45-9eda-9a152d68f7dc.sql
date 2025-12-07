-- Add email notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_testimonial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_referral BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_meeting BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rd_station_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;