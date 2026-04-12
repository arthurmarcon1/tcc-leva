
-- Tabela de solicitações de envio
CREATE TABLE public.shipment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  description TEXT NOT NULL,
  package_size TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view their own requests
CREATE POLICY "Requesters can view own requests"
ON public.shipment_requests FOR SELECT
USING (auth.uid() = requester_id);

-- Driver can view requests for their trips
CREATE POLICY "Drivers can view requests for their trips"
ON public.shipment_requests FOR SELECT
USING (auth.uid() = driver_id);

-- Authenticated users can create requests
CREATE POLICY "Users can create requests"
ON public.shipment_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Driver can update request status (accept/reject)
CREATE POLICY "Drivers can update request status"
ON public.shipment_requests FOR UPDATE
USING (auth.uid() = driver_id);

-- Requester can cancel their own request
CREATE POLICY "Requesters can cancel own requests"
ON public.shipment_requests FOR UPDATE
USING (auth.uid() = requester_id AND status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_shipment_requests_updated_at
BEFORE UPDATE ON public.shipment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow service role / trigger to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Function to auto-create notification on new shipment request
CREATE OR REPLACE FUNCTION public.notify_new_shipment_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
  trip_dest TEXT;
BEGIN
  SELECT full_name INTO requester_name FROM profiles WHERE user_id = NEW.requester_id;
  SELECT destination INTO trip_dest FROM trips WHERE id = NEW.trip_id;
  
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    NEW.driver_id,
    'Nova solicitação de envio',
    COALESCE(requester_name, 'Alguém') || ' quer enviar "' || NEW.description || '" para ' || trip_dest,
    'shipment_request'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_shipment_request
AFTER INSERT ON public.shipment_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_shipment_request();

-- Function to notify status changes
CREATE OR REPLACE FUNCTION public.notify_shipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_name TEXT;
  status_label TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  SELECT full_name INTO driver_name FROM profiles WHERE user_id = NEW.driver_id;
  
  CASE NEW.status
    WHEN 'accepted' THEN status_label := 'aceita';
    WHEN 'rejected' THEN status_label := 'recusada';
    WHEN 'in_transit' THEN status_label := 'em trânsito';
    WHEN 'delivered' THEN status_label := 'entregue';
    WHEN 'cancelled' THEN status_label := 'cancelada';
    ELSE status_label := NEW.status;
  END CASE;
  
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    NEW.requester_id,
    'Atualização do envio',
    'Sua solicitação de envio "' || NEW.description || '" foi ' || status_label || ' por ' || COALESCE(driver_name, 'o motorista'),
    'shipment_update'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_shipment_status_change
AFTER UPDATE ON public.shipment_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_shipment_status_change();

-- Enable realtime for shipment_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_requests;
