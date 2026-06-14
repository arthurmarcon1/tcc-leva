// __tests__/business-logic.test.js
// Testes da lógica de negócio do Leva.
// IMPORTANTE: estes testes importam o módulo REAL usado pela aplicação
// (src/lib/validation.ts) — as mesmas funções chamadas em Publish.tsx,
// ShipmentRequestDialog.tsx e na máquina de estados das solicitações.

import {
  validateTrip,
  validateShipmentRequest,
  validateReview,
  canReview,
  canTransition,
  calculateAverageRating,
  PACKAGE_SIZE_LABELS,
  STATUS_META,
} from '@/lib/validation';

const TODAY = '2026-06-11';

// ─── Viagens (trips) ──────────────────────────────────────────────────────────

describe('Leva — Validação de Viagens (trips)', () => {
  const baseTrip = {
    origin: 'Santiago, RS',
    destination: 'Santa Maria, RS',
    trip_date: '2026-07-01',
    package_size: 'medium',
    suggested_price: 50,
  };

  test('viagem válida passa sem erros', () => {
    const result = validateTrip(baseTrip, TODAY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('origem vazia gera erro', () => {
    const result = validateTrip({ ...baseTrip, origin: '' }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Origem é obrigatória');
  });

  test('destino vazio gera erro', () => {
    const result = validateTrip({ ...baseTrip, destination: '' }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Destino é obrigatório');
  });

  test('origem igual ao destino gera erro', () => {
    const result = validateTrip(
      { ...baseTrip, destination: 'Santiago, RS' },
      TODAY
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Origem e destino não podem ser iguais');
  });

  test('origem igual ao destino com caixa diferente também gera erro', () => {
    const result = validateTrip(
      { ...baseTrip, destination: 'santiago, rs' },
      TODAY
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Origem e destino não podem ser iguais');
  });

  test('data ausente gera erro', () => {
    const result = validateTrip({ ...baseTrip, trip_date: '' }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Data da viagem é obrigatória');
  });

  test('data no passado gera erro', () => {
    const result = validateTrip({ ...baseTrip, trip_date: '2026-06-10' }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('A data da viagem não pode estar no passado');
  });

  test('viagem para hoje é permitida', () => {
    const result = validateTrip({ ...baseTrip, trip_date: TODAY }, TODAY);
    expect(result.valid).toBe(true);
  });

  test('tamanho de pacote inválido gera erro', () => {
    const result = validateTrip({ ...baseTrip, package_size: 'gigante' }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tamanho do pacote inválido');
  });

  test('aceita os quatro tamanhos reais usados pela interface', () => {
    for (const size of ['envelope', 'small', 'medium', 'large']) {
      const result = validateTrip({ ...baseTrip, package_size: size }, TODAY);
      expect(result.valid).toBe(true);
    }
  });

  test('contribuição negativa gera erro', () => {
    const result = validateTrip({ ...baseTrip, suggested_price: -5 }, TODAY);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Contribuição sugerida não pode ser negativa');
  });

  test('contribuição zero é permitida (plataforma sem fins lucrativos)', () => {
    const result = validateTrip({ ...baseTrip, suggested_price: 0 }, TODAY);
    expect(result.valid).toBe(true);
  });
});

// ─── Solicitações de envio (shipment_requests) ───────────────────────────────

describe('Leva — Validação de Solicitações de Envio (shipment_requests)', () => {
  const baseRequest = {
    trip_id: 'trip-1',
    requester_id: 'user-a',
    driver_id: 'user-b',
    description: 'Caixa com documentos',
    package_size: 'small',
  };

  test('solicitação válida passa sem erros', () => {
    const result = validateShipmentRequest(baseRequest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('descrição muito curta gera erro', () => {
    const result = validateShipmentRequest({ ...baseRequest, description: 'ab' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Descrição deve ter ao menos 3 caracteres');
  });

  test('requester e driver iguais gera erro (RF12)', () => {
    const result = validateShipmentRequest({
      ...baseRequest,
      driver_id: 'user-a',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Não é possível solicitar envio na própria viagem');
  });

  test('trip_id ausente gera erro', () => {
    const result = validateShipmentRequest({ ...baseRequest, trip_id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ID da viagem é obrigatório');
  });

  test('tamanho de pacote fora do domínio gera erro', () => {
    const result = validateShipmentRequest({
      ...baseRequest,
      package_size: 'extra_large',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tamanho do pacote inválido');
  });
});

// ─── Avaliações (reviews) ─────────────────────────────────────────────────────

describe('Leva — Validação de Avaliações (reviews)', () => {
  const baseReview = {
    shipment_request_id: 'req-1',
    reviewer_id: 'user-a',
    reviewed_id: 'user-b',
    rating: 5,
    comment: 'Entrega rápida e cuidadosa',
  };

  test('avaliação válida com nota 5 e comentário', () => {
    const result = validateReview(baseReview);
    expect(result.valid).toBe(true);
  });

  test('nota 0 é inválida', () => {
    const result = validateReview({ ...baseReview, rating: 0 });
    expect(result.valid).toBe(false);
  });

  test('nota 6 é inválida', () => {
    const result = validateReview({ ...baseReview, rating: 6 });
    expect(result.valid).toBe(false);
  });

  test('nota decimal é inválida', () => {
    const result = validateReview({ ...baseReview, rating: 4.5 });
    expect(result.valid).toBe(false);
  });

  test('usuário não pode avaliar a si mesmo', () => {
    const result = validateReview({ ...baseReview, reviewed_id: 'user-a' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Usuário não pode avaliar a si mesmo');
  });

  test('comentário acima de 500 caracteres gera erro', () => {
    const result = validateReview({ ...baseReview, comment: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
  });

  test('comentário vazio é permitido (campo opcional)', () => {
    const result = validateReview({ ...baseReview, comment: null });
    expect(result.valid).toBe(true);
  });
});

// ─── Máquina de estados da solicitação ───────────────────────────────────────

describe('Leva — Máquina de estados da solicitação', () => {
  test('transições válidas a partir de pending', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  test('fluxo feliz: pending → accepted → in_transit → delivered', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
    expect(canTransition('accepted', 'in_transit')).toBe(true);
    expect(canTransition('in_transit', 'delivered')).toBe(true);
  });

  test('não é possível pular etapas', () => {
    expect(canTransition('pending', 'delivered')).toBe(false);
    expect(canTransition('pending', 'in_transit')).toBe(false);
    expect(canTransition('accepted', 'delivered')).toBe(false);
  });

  test('estados finais não permitem novas transições', () => {
    expect(canTransition('delivered', 'pending')).toBe(false);
    expect(canTransition('rejected', 'accepted')).toBe(false);
    expect(canTransition('cancelled', 'pending')).toBe(false);
  });

  test('cancelamento só é possível enquanto pendente (RF15)', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('accepted', 'cancelled')).toBe(false);
    expect(canTransition('in_transit', 'cancelled')).toBe(false);
  });
});

// ─── Permissão para avaliar ───────────────────────────────────────────────────

describe('Leva — Regra de negócio: permissão para avaliar', () => {
  const delivered = {
    status: 'delivered',
    requester_id: 'user-a',
    driver_id: 'user-b',
  };

  test('requester pode avaliar após entrega', () => {
    expect(canReview(delivered, 'user-a')).toBe(true);
  });

  test('driver pode avaliar após entrega', () => {
    expect(canReview(delivered, 'user-b')).toBe(true);
  });

  test('terceiro não pode avaliar', () => {
    expect(canReview(delivered, 'user-c')).toBe(false);
  });

  test('não pode avaliar se status for pending', () => {
    expect(canReview({ ...delivered, status: 'pending' }, 'user-a')).toBe(false);
  });

  test('não pode avaliar se status for accepted', () => {
    expect(canReview({ ...delivered, status: 'accepted' }, 'user-a')).toBe(false);
  });
});

// ─── Utilitários ──────────────────────────────────────────────────────────────

describe('Leva — Utilitários de domínio', () => {
  test('labels dos tamanhos de pacote batem com a interface', () => {
    expect(PACKAGE_SIZE_LABELS.envelope).toBe('Envelope');
    expect(PACKAGE_SIZE_LABELS.small).toBe('Caixa pequena');
    expect(PACKAGE_SIZE_LABELS.medium).toBe('Caixa média');
    expect(PACKAGE_SIZE_LABELS.large).toBe('Bagagem grande');
  });

  test('labels de status em português', () => {
    expect(STATUS_META.pending.label).toBe('Pendente');
    expect(STATUS_META.in_transit.label).toBe('Em trânsito');
    expect(STATUS_META.delivered.label).toBe('Entregue');
    expect(STATUS_META.cancelled.label).toBe('Cancelado');
  });

  test('média de avaliações com uma casa decimal', () => {
    expect(calculateAverageRating([5, 4, 4])).toBe(4.3);
    expect(calculateAverageRating([5])).toBe(5);
  });

  test('média sem avaliações retorna null', () => {
    expect(calculateAverageRating([])).toBeNull();
  });
});
