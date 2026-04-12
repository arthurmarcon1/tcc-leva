
-- Remove the overly permissive notification insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
