// __tests__/components.test.jsx
// Testes de componentes React do Leva
// Usa React Testing Library para simular renderização e interações

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Componentes simulando os do Leva ────────────────────────────────────────
// (Em produção estes seriam importados de src/components/)

// Badge de status da solicitação
function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Pendente', color: '#f59e0b' },
    accepted: { label: 'Aceita', color: '#10b981' },
    rejected: { label: 'Recusada', color: '#ef4444' },
    in_transit: { label: 'Em Trânsito', color: '#3b82f6' },
    delivered: { label: 'Entregue', color: '#8b5cf6' },
    cancelled: { label: 'Cancelada', color: '#6b7280' },
  };
  const s = config[status] ?? { label: 'Desconhecido', color: '#000' };
  return (
    <span
      data-testid="status-badge"
      style={{ backgroundColor: s.color }}
      aria-label={`Status: ${s.label}`}
    >
      {s.label}
    </span>
  );
}

// Card de viagem
function TripCard({ trip, onSelect }) {
  return (
    <div data-testid="trip-card">
      <h3 data-testid="trip-route">
        {trip.origin} → {trip.destination}
      </h3>
      <p data-testid="trip-date">{trip.trip_date}</p>
      <p data-testid="trip-price">R$ {trip.suggested_price.toFixed(2)}</p>
      <span data-testid="trip-size">{trip.package_size}</span>
      <button data-testid="trip-select-btn" onClick={() => onSelect(trip)}>
        Solicitar Envio
      </button>
    </div>
  );
}

// Formulário de avaliação
function ReviewForm({ onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      setError('Selecione uma nota');
      return;
    }
    setError('');
    onSubmit({ rating, comment });
  };

  return (
    <div data-testid="review-form">
      <div data-testid="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            data-testid={`star-${star}`}
            aria-pressed={rating >= star}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        data-testid="comment-input"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Deixe um comentário (opcional)"
      />
      {error && <p data-testid="form-error">{error}</p>}
      <button data-testid="submit-review-btn" onClick={handleSubmit}>
        Enviar Avaliação
      </button>
      <button data-testid="cancel-review-btn" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}

// Campo de busca de viagens
function TripSearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div data-testid="search-bar">
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Para onde vai?"
      />
      <button data-testid="search-btn" onClick={handleSearch}>
        Buscar
      </button>
    </div>
  );
}

// Lista de notificações
function NotificationList({ notifications }) {
  if (!notifications || notifications.length === 0) {
    return <p data-testid="empty-notifications">Nenhuma notificação</p>;
  }
  return (
    <ul data-testid="notification-list">
      {notifications.map((n) => (
        <li key={n.id} data-testid={`notification-${n.id}`} className={n.read ? 'read' : 'unread'}>
          <strong>{n.title}</strong>
          <span>{n.message}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Testes: StatusBadge ─────────────────────────────────────────────────────

describe('StatusBadge — exibição de status', () => {
  test('renderiza "Pendente" para status pending', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Pendente');
  });

  test('renderiza "Aceita" para status accepted', () => {
    render(<StatusBadge status="accepted" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Aceita');
  });

  test('renderiza "Em Trânsito" para status in_transit', () => {
    render(<StatusBadge status="in_transit" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Em Trânsito');
  });

  test('renderiza "Entregue" para status delivered', () => {
    render(<StatusBadge status="delivered" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Entregue');
  });

  test('renderiza "Desconhecido" para status inválido', () => {
    render(<StatusBadge status="xyz" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Desconhecido');
  });

  test('possui aria-label com o status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByLabelText('Status: Cancelada')).toBeInTheDocument();
  });
});

// ─── Testes: TripCard ─────────────────────────────────────────────────────────

describe('TripCard — exibição e interação', () => {
  const fakeTrip = {
    id: 'uuid-1',
    origin: 'Santa Maria',
    destination: 'Porto Alegre',
    trip_date: '2026-05-01',
    suggested_price: 50.0,
    package_size: 'medium',
  };

  test('renderiza origem e destino corretamente', () => {
    render(<TripCard trip={fakeTrip} onSelect={jest.fn()} />);
    expect(screen.getByTestId('trip-route')).toHaveTextContent('Santa Maria → Porto Alegre');
  });

  test('renderiza preço formatado', () => {
    render(<TripCard trip={fakeTrip} onSelect={jest.fn()} />);
    expect(screen.getByTestId('trip-price')).toHaveTextContent('R$ 50.00');
  });

  test('renderiza data da viagem', () => {
    render(<TripCard trip={fakeTrip} onSelect={jest.fn()} />);
    expect(screen.getByTestId('trip-date')).toHaveTextContent('2026-05-01');
  });

  test('botão "Solicitar Envio" chama onSelect com a trip', () => {
    const onSelect = jest.fn();
    render(<TripCard trip={fakeTrip} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('trip-select-btn'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(fakeTrip);
  });
});

// ─── Testes: ReviewForm ───────────────────────────────────────────────────────

describe('ReviewForm — interação do usuário', () => {
  test('renderiza 5 estrelas clicáveis', () => {
    render(<ReviewForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument();
    }
  });

  test('exibe erro se tentar enviar sem nota', () => {
    render(<ReviewForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByTestId('submit-review-btn'));
    expect(screen.getByTestId('form-error')).toHaveTextContent('Selecione uma nota');
  });

  test('não chama onSubmit se nota não foi selecionada', () => {
    const onSubmit = jest.fn();
    render(<ReviewForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByTestId('submit-review-btn'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('chama onSubmit com rating e comment corretos', () => {
    const onSubmit = jest.fn();
    render(<ReviewForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    fireEvent.click(screen.getByTestId('star-4'));
    fireEvent.change(screen.getByTestId('comment-input'), {
      target: { value: 'Muito bom!' },
    });
    fireEvent.click(screen.getByTestId('submit-review-btn'));

    expect(onSubmit).toHaveBeenCalledWith({ rating: 4, comment: 'Muito bom!' });
  });

  test('botão cancelar chama onCancel', () => {
    const onCancel = jest.fn();
    render(<ReviewForm onSubmit={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-review-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── Testes: TripSearchBar ────────────────────────────────────────────────────

describe('TripSearchBar — busca de viagens', () => {
  test('renderiza input e botão', () => {
    render(<TripSearchBar onSearch={jest.fn()} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-btn')).toBeInTheDocument();
  });

  test('chama onSearch com o texto digitado', () => {
    const onSearch = jest.fn();
    render(<TripSearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByTestId('search-input'), {
      target: { value: 'Porto Alegre' },
    });
    fireEvent.click(screen.getByTestId('search-btn'));
    expect(onSearch).toHaveBeenCalledWith('Porto Alegre');
  });

  test('não chama onSearch para query vazia', () => {
    const onSearch = jest.fn();
    render(<TripSearchBar onSearch={onSearch} />);
    fireEvent.click(screen.getByTestId('search-btn'));
    expect(onSearch).not.toHaveBeenCalled();
  });

  test('remove espaços extras da busca', () => {
    const onSearch = jest.fn();
    render(<TripSearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByTestId('search-input'), {
      target: { value: '  Pelotas  ' },
    });
    fireEvent.click(screen.getByTestId('search-btn'));
    expect(onSearch).toHaveBeenCalledWith('Pelotas');
  });
});

// ─── Testes: NotificationList ─────────────────────────────────────────────────

describe('NotificationList — lista de notificações', () => {
  test('exibe mensagem quando não há notificações', () => {
    render(<NotificationList notifications={[]} />);
    expect(screen.getByTestId('empty-notifications')).toHaveTextContent(
      'Nenhuma notificação'
    );
  });

  test('renderiza lista quando há notificações', () => {
    const notifications = [
      { id: '1', title: 'Nova solicitação', message: 'Alguém quer enviar algo', read: false },
      { id: '2', title: 'Envio aceito', message: 'Sua entrega foi aceita', read: true },
    ];
    render(<NotificationList notifications={notifications} />);
    expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    expect(screen.getByTestId('notification-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-2')).toBeInTheDocument();
  });

  test('notificação não lida tem classe "unread"', () => {
    const notifications = [
      { id: '1', title: 'Nova solicitação', message: 'Mensagem', read: false },
    ];
    render(<NotificationList notifications={notifications} />);
    expect(screen.getByTestId('notification-1')).toHaveClass('unread');
  });

  test('notificação lida tem classe "read"', () => {
    const notifications = [
      { id: '1', title: 'Notif', message: 'Lida', read: true },
    ];
    render(<NotificationList notifications={notifications} />);
    expect(screen.getByTestId('notification-1')).toHaveClass('read');
  });

  test('renderiza null sem crash', () => {
    render(<NotificationList notifications={null} />);
    expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
  });
});
