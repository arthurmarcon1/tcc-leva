// __tests__/business-logic.test.js
// Testes de lógica de negócio do Leva
// Cobertura: validações, transformações e regras de domínio

// ─── Utilitários do domínio ───────────────────────────────────────────────────

/**
 * Valida os dados de uma viagem antes de enviar ao Supabase.
 * Retorna { valid: boolean, errors: string[] }
 */
function validateTrip(trip) {
  const errors = [];

  if (!trip.origin || trip.origin.trim() === '')
    errors.push('Origem é obrigatória');

  if (!trip.destination || trip.destination.trim() === '')
    errors.push('Destino é obrigatório');

  if (trip.origin && trip.destination && trip.origin.trim() === trip.destination.trim())
    errors.push('Origem e destino não podem ser iguais');

  if (!trip.trip_date)
    errors.push('Data da viagem é obrigatória');

  const validSizes = ['small', 'medium', 'large', 'extra_large'];
  if (!trip.package_size || !validSizes.includes(trip.package_size))
    errors.push('Tamanho do pacote inválido');

  if (trip.suggested_price < 0)
    errors.push('Preço não pode ser negativo');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida uma solicitação de envio.
 */
function validateShipmentRequest(req) {
  const errors = [];

  if (!req.description || req.description.trim().length < 3)
    errors.push('Descrição deve ter ao menos 3 caracteres');

  const validSizes = ['small', 'medium', 'large', 'extra_large'];
  if (!req.package_size || !validSizes.includes(req.package_size))
    errors.push('Tamanho do pacote inválido');

  if (!req.trip_id)
    errors.push('ID da viagem é obrigatório');

  if (req.requester_id && req.driver_id && req.requester_id === req.driver_id)
    errors.push('Usuário não pode solicitar envio para si mesmo');

  return { valid: errors.length === 0, errors };
}

/**
 * Valida uma avaliação (review).
 */
function validateReview(review) {
  const errors = [];

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5)
    errors.push('Avaliação deve ser um número inteiro entre 1 e 5');

  if (!review.shipment_request_id)
    errors.push('ID da solicitação é obrigatório');

  if (review.reviewer_id === review.reviewed_id)
    errors.push('Usuário não pode avaliar a si mesmo');

  if (review.comment && review.comment.length > 500)
    errors.push('Comentário não pode ter mais de 500 caracteres');

  return { valid: errors.length === 0, errors };
}

/**
 * Formata o tamanho do pacote para exibição.
 */
function formatPackageSize(size) {
  const labels = {
    small: 'Pequeno',
    medium: 'Médio',
    large: 'Grande',
    extra_large: 'Extra Grande',
  };
  return labels[size] ?? 'Desconhecido';
}

/**
 * Calcula o preço sugerido com base na distância estimada (em km).
 * Fórmula simples: R$ 3,00 base + R$ 0,50 por km
 */
function calculateSuggestedPrice(distanceKm) {
  if (distanceKm < 0) throw new Error('Distância não pode ser negativa');
  return parseFloat((3.0 + distanceKm * 0.5).toFixed(2));
}

/**
 * Retorna o status de uma solicitação em português.
 */
function getStatusLabel(status) {
  const map = {
    pending: 'Pendente',
    accepted: 'Aceita',
    rejected: 'Recusada',
    in_transit: 'Em Trânsito',
    delivered: 'Entregue',
    cancelled: 'Cancelada',
  };
  return map[status] ?? 'Desconhecido';
}

/**
 * Verifica se um usuário pode avaliar uma solicitação.
 * Regra: status deve ser 'delivered' e usuário deve ser requester ou driver.
 */
function canReview(shipmentRequest, userId) {
  if (shipmentRequest.status !== 'delivered') return false;
  return (
    shipmentRequest.requester_id === userId ||
    shipmentRequest.driver_id === userId
  );
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('Leva — Validação de Viagens (trips)', () => {
  test('viagem válida passa sem erros', () => {
    const trip = {
      origin: 'Santa Maria',
      destination: 'Porto Alegre',
      trip_date: '2026-05-01',
      package_size: 'medium',
      suggested_price: 50,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('origem vazia gera erro', () => {
    const trip = {
      origin: '',
      destination: 'Porto Alegre',
      trip_date: '2026-05-01',
      package_size: 'small',
      suggested_price: 20,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Origem é obrigatória');
  });

  test('destino vazio gera erro', () => {
    const trip = {
      origin: 'Santa Maria',
      destination: '',
      trip_date: '2026-05-01',
      package_size: 'small',
      suggested_price: 20,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Destino é obrigatório');
  });

  test('origem igual ao destino gera erro', () => {
    const trip = {
      origin: 'Santa Maria',
      destination: 'Santa Maria',
      trip_date: '2026-05-01',
      package_size: 'large',
      suggested_price: 30,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Origem e destino não podem ser iguais');
  });

  test('tamanho de pacote inválido gera erro', () => {
    const trip = {
      origin: 'Santa Maria',
      destination: 'Cachoeira do Sul',
      trip_date: '2026-05-01',
      package_size: 'gigante', // inválido
      suggested_price: 40,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tamanho do pacote inválido');
  });

  test('preço negativo gera erro', () => {
    const trip = {
      origin: 'Santa Maria',
      destination: 'Porto Alegre',
      trip_date: '2026-05-01',
      package_size: 'medium',
      suggested_price: -10,
    };
    const result = validateTrip(trip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Preço não pode ser negativo');
  });
});

describe('Leva — Validação de Solicitações de Envio (shipment_requests)', () => {
  test('solicitação válida passa sem erros', () => {
    const req = {
      description: 'Caixa de livros',
      package_size: 'medium',
      trip_id: 'uuid-trip-1',
      requester_id: 'uuid-user-a',
      driver_id: 'uuid-user-b',
    };
    const result = validateShipmentRequest(req);
    expect(result.valid).toBe(true);
  });

  test('descrição muito curta gera erro', () => {
    const req = {
      description: 'AB',
      package_size: 'small',
      trip_id: 'uuid-trip-1',
      requester_id: 'uuid-user-a',
      driver_id: 'uuid-user-b',
    };
    const result = validateShipmentRequest(req);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Descrição deve ter ao menos 3 caracteres');
  });

  test('requester e driver iguais gera erro', () => {
    const req = {
      description: 'Notebook',
      package_size: 'medium',
      trip_id: 'uuid-trip-1',
      requester_id: 'uuid-user-a',
      driver_id: 'uuid-user-a',
    };
    const result = validateShipmentRequest(req);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Usuário não pode solicitar envio para si mesmo');
  });

  test('trip_id ausente gera erro', () => {
    const req = {
      description: 'Caixas de sapato',
      package_size: 'large',
      trip_id: null,
      requester_id: 'uuid-user-a',
      driver_id: 'uuid-user-b',
    };
    const result = validateShipmentRequest(req);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ID da viagem é obrigatório');
  });
});

describe('Leva — Validação de Avaliações (reviews)', () => {
  test('avaliação válida com nota 5 e comentário', () => {
    const review = {
      rating: 5,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
      comment: 'Entrega rápida e cuidadosa!',
    };
    const result = validateReview(review);
    expect(result.valid).toBe(true);
  });

  test('nota 0 é inválida', () => {
    const review = {
      rating: 0,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
    };
    const result = validateReview(review);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Avaliação deve ser um número inteiro entre 1 e 5');
  });

  test('nota 6 é inválida', () => {
    const review = {
      rating: 6,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
    };
    expect(validateReview(review).valid).toBe(false);
  });

  test('nota decimal é inválida', () => {
    const review = {
      rating: 4.5,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
    };
    expect(validateReview(review).valid).toBe(false);
  });

  test('usuário não pode avaliar a si mesmo', () => {
    const review = {
      rating: 5,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-a',
    };
    const result = validateReview(review);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Usuário não pode avaliar a si mesmo');
  });

  test('comentário acima de 500 chars gera erro', () => {
    const review = {
      rating: 3,
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
      comment: 'a'.repeat(501),
    };
    expect(validateReview(review).valid).toBe(false);
  });
});

describe('Leva — Utilitários de Formatação e Cálculo', () => {
  test('formatPackageSize retorna label correto', () => {
    expect(formatPackageSize('small')).toBe('Pequeno');
    expect(formatPackageSize('medium')).toBe('Médio');
    expect(formatPackageSize('large')).toBe('Grande');
    expect(formatPackageSize('extra_large')).toBe('Extra Grande');
  });

  test('formatPackageSize retorna "Desconhecido" para valor inválido', () => {
    expect(formatPackageSize('super_huge')).toBe('Desconhecido');
    expect(formatPackageSize(undefined)).toBe('Desconhecido');
  });

  test('calculateSuggestedPrice calcula corretamente', () => {
    expect(calculateSuggestedPrice(0)).toBe(3.0);
    expect(calculateSuggestedPrice(10)).toBe(8.0);
    expect(calculateSuggestedPrice(100)).toBe(53.0);
  });

  test('calculateSuggestedPrice lança erro para distância negativa', () => {
    expect(() => calculateSuggestedPrice(-5)).toThrow('Distância não pode ser negativa');
  });

  test('getStatusLabel retorna labels em português', () => {
    expect(getStatusLabel('pending')).toBe('Pendente');
    expect(getStatusLabel('accepted')).toBe('Aceita');
    expect(getStatusLabel('in_transit')).toBe('Em Trânsito');
    expect(getStatusLabel('delivered')).toBe('Entregue');
    expect(getStatusLabel('cancelled')).toBe('Cancelada');
    expect(getStatusLabel('rejected')).toBe('Recusada');
  });

  test('getStatusLabel retorna "Desconhecido" para status inválido', () => {
    expect(getStatusLabel('qualquer_coisa')).toBe('Desconhecido');
  });
});

describe('Leva — Regra de negócio: permissão para avaliar', () => {
  const deliveredRequest = {
    id: 'uuid-req-1',
    requester_id: 'uuid-user-a',
    driver_id: 'uuid-user-b',
    status: 'delivered',
  };

  test('requester pode avaliar após entrega', () => {
    expect(canReview(deliveredRequest, 'uuid-user-a')).toBe(true);
  });

  test('driver pode avaliar após entrega', () => {
    expect(canReview(deliveredRequest, 'uuid-user-b')).toBe(true);
  });

  test('terceiro não pode avaliar', () => {
    expect(canReview(deliveredRequest, 'uuid-user-c')).toBe(false);
  });

  test('não pode avaliar se status for pending', () => {
    const pendingRequest = { ...deliveredRequest, status: 'pending' };
    expect(canReview(pendingRequest, 'uuid-user-a')).toBe(false);
  });

  test('não pode avaliar se status for accepted', () => {
    const acceptedRequest = { ...deliveredRequest, status: 'accepted' };
    expect(canReview(acceptedRequest, 'uuid-user-a')).toBe(false);
  });
});
