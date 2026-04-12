
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_request_id UUID NOT NULL REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewed_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (shipment_request_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for delivered shipments" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM shipment_requests sr
      WHERE sr.id = shipment_request_id
        AND sr.status = 'delivered'
        AND (sr.requester_id = auth.uid() OR sr.driver_id = auth.uid())
    )
  );
