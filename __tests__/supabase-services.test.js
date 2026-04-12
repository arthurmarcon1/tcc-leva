// __tests__/supabase-services.test.js
// Testes dos serviços que interagem com o Supabase
// Usa mocks para simular as respostas sem precisar de conexão real

// ─── Mock do cliente Supabase ─────────────────────────────────────────────────

const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

// Encadeamento fluente: cada método retorna o mesmo objeto
const queryBuilder = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
};

Object.values(queryBuilder).forEach((fn) => fn.mockReturnValue(queryBuilder));

const mockFrom = jest.fn().mockReturnValue(queryBuilder);
const mockRpc = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// ─── Serviços simulando o padrão do Leva ─────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost', 'fake-key');

// Serviço de viagens
const tripsService = {
  async getActiveTrips() {
    const result = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    return result;
  },

  async createTrip(tripData) {
    const result = await supabase.from('trips').insert(tripData).select().single();
    return result;
  },

  async updateTripStatus(tripId, status) {
    const result = await supabase
      .from('trips')
      .update({ status })
      .eq('id', tripId)
      .select()
      .single();
    return result;
  },
};

// Serviço de solicitações
const shipmentsService = {
  async createShipmentRequest(data) {
    const result = await supabase
      .from('shipment_requests')
      .insert(data)
      .select()
      .single();
    return result;
  },

  async getRequestsByUser(userId) {
    const result = await supabase
      .from('shipment_requests')
      .select('*, trips(*), profiles!requester_id(*)')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });
    return result;
  },

  async acceptRequest(requestId) {
    const result = await supabase
      .from('shipment_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select()
      .single();
    return result;
  },
};

// Serviço de perfil
const profilesService = {
  async getProfile(userId) {
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return result;
  },

  async updateProfile(userId, data) {
    const result = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', userId)
      .select()
      .single();
    return result;
  },
};

// Serviço de avaliações
const reviewsService = {
  async createReview(reviewData) {
    const result = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();
    return result;
  },

  async getReviewsByUser(userId) {
    const result = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false });
    return result;
  },
};

// ─── Testes ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Por padrão retorna objeto vazio sem erro
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockOrder.mockReturnValue({ data: [], error: null });
});

describe('tripsService — buscar viagens ativas', () => {
  test('chama from("trips") com filtro status active', async () => {
    mockOrder.mockReturnValue({ data: [{ id: '1', status: 'active' }], error: null });

    await tripsService.getActiveTrips();

    expect(mockFrom).toHaveBeenCalledWith('trips');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('retorna lista de viagens quando há dados', async () => {
    const fakeTrips = [
      { id: 'uuid-1', origin: 'Santa Maria', destination: 'Porto Alegre', status: 'active' },
      { id: 'uuid-2', origin: 'Cachoeira do Sul', destination: 'Pelotas', status: 'active' },
    ];
    mockOrder.mockReturnValue({ data: fakeTrips, error: null });

    const result = await tripsService.getActiveTrips();

    expect(result.data).toHaveLength(2);
    expect(result.data[0].origin).toBe('Santa Maria');
    expect(result.error).toBeNull();
  });

  test('retorna erro quando Supabase falha', async () => {
    const fakeError = { message: 'Erro de conexão', code: '500' };
    mockOrder.mockReturnValue({ data: null, error: fakeError });

    const result = await tripsService.getActiveTrips();

    expect(result.error).not.toBeNull();
    expect(result.error.message).toBe('Erro de conexão');
  });
});

describe('tripsService — criar viagem', () => {
  test('chama from("trips").insert com os dados corretos', async () => {
    const newTrip = {
      origin: 'Santa Maria',
      destination: 'Porto Alegre',
      trip_date: '2026-05-01',
      package_size: 'medium',
      suggested_price: 50,
    };
    mockSingle.mockResolvedValue({ data: { id: 'uuid-new', ...newTrip }, error: null });

    const result = await tripsService.createTrip(newTrip);

    expect(mockFrom).toHaveBeenCalledWith('trips');
    expect(mockInsert).toHaveBeenCalledWith(newTrip);
    expect(result.data.id).toBe('uuid-new');
  });

  test('retorna erro se inserção falhar', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });

    const result = await tripsService.createTrip({});

    expect(result.error.message).toBe('RLS violation');
  });
});

describe('tripsService — atualizar status', () => {
  test('chama update com status correto e eq com id correto', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-1', status: 'inactive' },
      error: null,
    });

    await tripsService.updateTripStatus('uuid-1', 'inactive');

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' });
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-1');
  });
});

describe('shipmentsService — criar solicitação', () => {
  test('chama from("shipment_requests").insert', async () => {
    const reqData = {
      trip_id: 'uuid-trip-1',
      requester_id: 'uuid-user-a',
      driver_id: 'uuid-user-b',
      description: 'Caixa de livros',
      package_size: 'medium',
    };
    mockSingle.mockResolvedValue({ data: { id: 'uuid-req-1', ...reqData }, error: null });

    const result = await shipmentsService.createShipmentRequest(reqData);

    expect(mockFrom).toHaveBeenCalledWith('shipment_requests');
    expect(mockInsert).toHaveBeenCalledWith(reqData);
    expect(result.data.id).toBe('uuid-req-1');
  });
});

describe('shipmentsService — aceitar solicitação', () => {
  test('atualiza status para accepted', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-req-1', status: 'accepted' },
      error: null,
    });

    const result = await shipmentsService.acceptRequest('uuid-req-1');

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'accepted' });
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-req-1');
    expect(result.data.status).toBe('accepted');
  });
});

describe('profilesService — buscar perfil', () => {
  test('busca perfil pelo user_id', async () => {
    const fakeProfile = {
      id: 'uuid-profile-1',
      user_id: 'uuid-user-a',
      full_name: 'Arthur Marcon',
      phone: '55999999999',
    };
    mockSingle.mockResolvedValue({ data: fakeProfile, error: null });

    const result = await profilesService.getProfile('uuid-user-a');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-a');
    expect(result.data.full_name).toBe('Arthur Marcon');
  });

  test('retorna null se perfil não existir', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const result = await profilesService.getProfile('uuid-inexistente');

    expect(result.data).toBeNull();
  });
});

describe('profilesService — atualizar perfil', () => {
  test('chama update com os dados e eq com user_id', async () => {
    const updateData = { full_name: 'Arthur M.', bio: 'Motorista frequente' };
    mockSingle.mockResolvedValue({
      data: { user_id: 'uuid-user-a', ...updateData },
      error: null,
    });

    await profilesService.updateProfile('uuid-user-a', updateData);

    expect(mockUpdate).toHaveBeenCalledWith(updateData);
    expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-a');
  });
});

describe('reviewsService — criar avaliação', () => {
  test('chama from("reviews").insert', async () => {
    const reviewData = {
      shipment_request_id: 'uuid-req-1',
      reviewer_id: 'uuid-user-a',
      reviewed_id: 'uuid-user-b',
      rating: 5,
      comment: 'Excelente!',
    };
    mockSingle.mockResolvedValue({ data: { id: 'uuid-rev-1', ...reviewData }, error: null });

    const result = await reviewsService.createReview(reviewData);

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockInsert).toHaveBeenCalledWith(reviewData);
    expect(result.data.rating).toBe(5);
  });
});

describe('reviewsService — buscar avaliações de usuário', () => {
  test('filtra por reviewed_id', async () => {
    mockOrder.mockReturnValue({
      data: [{ id: 'uuid-rev-1', reviewed_id: 'uuid-user-b', rating: 4 }],
      error: null,
    });

    const result = await reviewsService.getReviewsByUser('uuid-user-b');

    expect(mockEq).toHaveBeenCalledWith('reviewed_id', 'uuid-user-b');
    expect(result.data[0].rating).toBe(4);
  });
});
