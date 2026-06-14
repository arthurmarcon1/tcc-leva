-- =====================================================================
-- Hardening de regras de negócio e correções de RLS — Leva
-- Revisão de segurança sobre o esquema criado nas migrations anteriores.
--
-- COMO APLICAR: Supabase Dashboard -> SQL Editor -> colar e executar
-- (ou `supabase db push` se você usa a CLI com o projeto linkado).
--
-- O que esta migration corrige:
--  1. BUG: o remetente não conseguia cancelar a própria solicitação.
--     A política "Requesters can cancel own requests" não tinha
--     WITH CHECK; pelo comportamento padrão do PostgreSQL, o USING
--     (que exige status = 'pending') era aplicado também à linha NOVA,
--     e o UPDATE para 'cancelled' era negado.
--  2. RF12 no banco: nada impedia solicitar envio na própria viagem
--     (a checagem existia só no cliente).
--  3. driver_id vinha do cliente sem validação: era possível criar
--     solicitação apontando qualquer usuário como portador (gerando
--     notificações falsas para terceiros).
--  4. Máquina de estados: nenhuma transição era validada (ex.:
--     delivered -> pending era aceito pelo banco).
--  5. A política de UPDATE do portador permitia alterar QUALQUER
--     coluna (descrição, remetente...), não apenas o status.
--  6. Avaliações: era possível avaliar a si mesmo ou um terceiro
--     (reviewed_id não era validado contra a contraparte do envio).
--  7. Domínio de status sem restrição (qualquer texto era aceito).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Restringir o domínio de status (NOT VALID: não revalida linhas
--    antigas, evitando falha caso exista dado de teste fora do padrão;
--    vale para todas as linhas novas/atualizadas)
-- ---------------------------------------------------------------------
ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('active', 'completed', 'cancelled')) NOT VALID;

ALTER TABLE public.shipment_requests
  ADD CONSTRAINT shipment_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'in_transit', 'delivered', 'cancelled')) NOT VALID;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_price_non_negative
  CHECK (suggested_price >= 0) NOT VALID;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_origin_destination_distinct
  CHECK (origin <> destination) NOT VALID;


-- ---------------------------------------------------------------------
-- 2) Integridade na CRIAÇÃO de solicitações
--    (RF12 + driver_id verdadeiro + viagem ativa)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_shipment_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_owner UUID;
  trip_status TEXT;
BEGIN
  SELECT user_id, status INTO trip_owner, trip_status
  FROM trips WHERE id = NEW.trip_id;

  IF trip_owner IS NULL THEN
    RAISE EXCEPTION 'Viagem inexistente';
  END IF;

  IF NEW.driver_id <> trip_owner THEN
    RAISE EXCEPTION 'O portador informado não é o dono da viagem';
  END IF;

  IF NEW.requester_id = NEW.driver_id THEN
    RAISE EXCEPTION 'Não é possível solicitar envio na própria viagem';
  END IF;

  IF trip_status <> 'active' THEN
    RAISE EXCEPTION 'A viagem não está mais ativa';
  END IF;

  IF NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'Toda solicitação deve iniciar como pendente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_shipment_request ON public.shipment_requests;
CREATE TRIGGER before_insert_shipment_request
  BEFORE INSERT ON public.shipment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shipment_request_insert();


-- ---------------------------------------------------------------------
-- 3) Máquina de estados + papéis na ATUALIZAÇÃO
--    pendente -> aceita | recusada | cancelada
--    aceita   -> em trânsito
--    em trânsito -> entregue
--    Cancelamento: apenas o remetente, apenas enquanto pendente (RF15).
--    Demais transições: apenas o portador.
--    Nenhuma outra coluna pode ser alterada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_shipment_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trip_id      IS DISTINCT FROM OLD.trip_id
  OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
  OR NEW.driver_id    IS DISTINCT FROM OLD.driver_id
  OR NEW.description  IS DISTINCT FROM OLD.description
  OR NEW.package_size IS DISTINCT FROM OLD.package_size THEN
    RAISE EXCEPTION 'Apenas o status da solicitação pode ser alterado';
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending'    AND NEW.status IN ('accepted', 'rejected', 'cancelled')) OR
    (OLD.status = 'accepted'   AND NEW.status = 'in_transit') OR
    (OLD.status = 'in_transit' AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'cancelled' THEN
    IF auth.uid() <> OLD.requester_id THEN
      RAISE EXCEPTION 'Apenas o remetente pode cancelar a solicitação';
    END IF;
  ELSE
    IF auth.uid() <> OLD.driver_id THEN
      RAISE EXCEPTION 'Apenas o portador pode executar esta transição';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_update_shipment_request ON public.shipment_requests;
CREATE TRIGGER before_update_shipment_request
  BEFORE UPDATE ON public.shipment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shipment_request_update();


-- ---------------------------------------------------------------------
-- 4) CORREÇÃO DO BUG do cancelamento: recriar a política do remetente
--    com WITH CHECK explícito (a linha antiga deve estar 'pending' e a
--    nova deve ser 'cancelled')
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Requesters can cancel own requests" ON public.shipment_requests;
CREATE POLICY "Requesters can cancel own requests"
ON public.shipment_requests FOR UPDATE
USING (auth.uid() = requester_id AND status = 'pending')
WITH CHECK (auth.uid() = requester_id AND status = 'cancelled');


-- ---------------------------------------------------------------------
-- 5) Avaliações: o avaliado deve ser a CONTRAPARTE do envio entregue
--    (impede autoavaliação e avaliação de terceiros)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create reviews for delivered shipments" ON public.reviews;
CREATE POLICY "Users can create reviews for delivered shipments"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id <> reviewed_id
  AND EXISTS (
    SELECT 1 FROM shipment_requests sr
    WHERE sr.id = shipment_request_id
      AND sr.status = 'delivered'
      AND (
        (sr.requester_id = auth.uid() AND sr.driver_id    = reviewed_id) OR
        (sr.driver_id    = auth.uid() AND sr.requester_id = reviewed_id)
      )
  )
);


-- ---------------------------------------------------------------------
-- 6) Conversas: impedir conversa consigo mesmo. A ordem canônica
--    (user1 < user2) já é garantida pela função
--    get_or_create_conversation, único caminho usado pelo aplicativo.
-- ---------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_distinct_users
  CHECK (user1_id <> user2_id) NOT VALID;


-- ---------------------------------------------------------------------
-- 7) Documentação da decisão sobre notificações:
--    a política permissiva de INSERT ("System can insert notifications",
--    WITH CHECK true) foi removida na migration 20260302184601 porque
--    permitia que qualquer usuário autenticado inserisse notificações
--    arbitrárias para qualquer outro. A inserção passa a ocorrer
--    exclusivamente pelos triggers SECURITY DEFINER
--    (notify_new_shipment_request / notify_shipment_status_change),
--    que executam como dono da tabela e não dependem de política.
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.notifications IS
  'Inserção apenas via triggers SECURITY DEFINER; sem política de INSERT por decisão de segurança.';


-- ---------------------------------------------------------------------
-- 8) Notificação de cancelamento corrigida: a função original enviava
--    a notificação de QUALQUER mudança de status ao remetente — então,
--    quando o próprio remetente cancelava, ELE recebia "Sua solicitação
--    foi cancelada por <portador>" (destinatário e autor errados).
--    Agora: cancelamento notifica o PORTADOR, com o nome do remetente;
--    as demais transições seguem notificando o remetente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_shipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_name TEXT;
  requester_name TEXT;
  status_label TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NEW.status = 'cancelled' THEN
    SELECT full_name INTO requester_name FROM profiles WHERE user_id = NEW.requester_id;
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.driver_id,
      'Solicitação cancelada',
      COALESCE(requester_name, 'O remetente') || ' cancelou a solicitação de envio "' || NEW.description || '"',
      'shipment_update'
    );
    RETURN NEW;
  END IF;

  SELECT full_name INTO driver_name FROM profiles WHERE user_id = NEW.driver_id;

  CASE NEW.status
    WHEN 'accepted' THEN status_label := 'aceita';
    WHEN 'rejected' THEN status_label := 'recusada';
    WHEN 'in_transit' THEN status_label := 'em trânsito';
    WHEN 'delivered' THEN status_label := 'entregue';
    ELSE status_label := NEW.status;
  END CASE;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    NEW.requester_id,
    'Atualização do envio',
    'Sua solicitação de envio "' || NEW.description || '" foi ' || status_label || ' por ' || COALESCE(driver_name, 'o portador'),
    'shipment_update'
  );
  RETURN NEW;
END;
$$;


-- =====================================================================
-- OPCIONAL (recomendado, mas exige mudança no frontend — aplicar só
-- depois da pesquisa SUS): privacidade do telefone.
-- Hoje a política "Users can view all profiles" expõe o campo phone de
-- todos os usuários a qualquer usuário autenticado, embora a interface
-- nunca exiba telefone de terceiros. Adequação à LGPD (minimização):
--
--   CREATE TABLE public.profile_private (
--     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--     phone TEXT,
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
--   );
--   ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "Owner only" ON public.profile_private
--     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--   INSERT INTO public.profile_private (user_id, phone)
--     SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL;
--   ALTER TABLE public.profiles DROP COLUMN phone;
--
-- No frontend, EditProfile.tsx passa a ler/gravar phone em
-- profile_private (e os tipos gerados precisam ser atualizados).
-- =====================================================================
