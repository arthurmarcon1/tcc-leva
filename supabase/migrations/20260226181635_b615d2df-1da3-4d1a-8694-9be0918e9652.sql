
-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_date DATE NOT NULL,
  trip_time TIME,
  package_size TEXT NOT NULL,
  suggested_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Everyone can view active trips
CREATE POLICY "Anyone can view active trips"
ON public.trips FOR SELECT
USING (status = 'active');

-- Users can view their own trips regardless of status
CREATE POLICY "Users can view own trips"
ON public.trips FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trips
CREATE POLICY "Users can create trips"
ON public.trips FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips"
ON public.trips FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips"
ON public.trips FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
