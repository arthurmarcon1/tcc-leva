// Regras de negócio do Leva.
// Este módulo centraliza as validações de domínio usadas pela interface
// (Publish, ShipmentRequestDialog, ReviewDialog) e é coberto pelos testes
// automatizados em __tests__/business-logic.test.js. As mesmas regras são
// reforçadas no banco de dados por políticas RLS e triggers (ver
// supabase/migrations/*hardening*.sql) — validação em camadas.

export const PACKAGE_SIZES = ["envelope", "small", "medium", "large"] as const;
export type PackageSize = (typeof PACKAGE_SIZES)[number];

export const PACKAGE_SIZE_LABELS: Record<PackageSize, string> = {
  envelope: "Envelope",
  small: "Caixa pequena",
  medium: "Caixa média",
  large: "Bagagem grande",
};

export type ShipmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_transit"
  | "delivered"
  | "cancelled";

// Rótulo e cor de cada status (usados na interface e nos testes).
export const STATUS_META: Record<ShipmentStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-accent/10 text-accent" },
  accepted: { label: "Aceito", color: "bg-primary/10 text-primary" },
  in_transit: { label: "Em trânsito", color: "bg-primary/10 text-primary" },
  delivered: { label: "Entregue", color: "bg-green-500/10 text-green-600" },
  rejected: { label: "Recusado", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
};

// Máquina de estados de uma solicitação de envio.
// Espelha o trigger validate_shipment_request_update do banco.
export const STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["in_transit"],
  in_transit: ["delivered"],
  rejected: [],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TripInput {
  origin: string;
  destination: string;
  trip_date: string; // formato YYYY-MM-DD
  trip_time?: string | null; // formato HH:MM
  package_size: string;
  suggested_price: number;
}

/** Data de hoje em YYYY-MM-DD (fuso local). */
export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function validateTrip(
  trip: TripInput,
  today: string = todayISO(),
  now: Date = new Date()
): ValidationResult {
  const errors: string[] = [];

  if (!trip.origin || trip.origin.trim() === "") errors.push("Origem é obrigatória");
  if (!trip.destination || trip.destination.trim() === "") errors.push("Destino é obrigatório");

  if (
    trip.origin &&
    trip.destination &&
    trip.origin.trim().toLowerCase() === trip.destination.trim().toLowerCase()
  ) {
    errors.push("Origem e destino não podem ser iguais");
  }

  if (!trip.trip_date) {
    errors.push("Data da viagem é obrigatória");
  } else if (trip.trip_date < today) {
    errors.push("A data da viagem não pode estar no passado");
  } else if (trip.trip_date === today && trip.trip_time) {
    const [h, m] = trip.trip_time.split(":").map(Number);
    const chosen = new Date(now);
    chosen.setHours(h, m, 0, 0);
    if (chosen <= now) {
      errors.push("O horário informado já passou. Escolha um horário futuro ou deixe em branco.");
    }
  }

  if (!trip.package_size || !PACKAGE_SIZES.includes(trip.package_size as PackageSize)) {
    errors.push("Tamanho do pacote inválido");
  }

  if (trip.suggested_price < 0) errors.push("A contribuição sugerida não pode ser negativa");
  if (trip.suggested_price > 9999) errors.push("A contribuição máxima é R$ 9.999");

  return { valid: errors.length === 0, errors };
}

export interface ShipmentRequestInput {
  trip_id: string;
  requester_id: string;
  driver_id: string;
  description: string;
  package_size: string;
}

export function validateShipmentRequest(req: ShipmentRequestInput): ValidationResult {
  const errors: string[] = [];

  if (!req.description || req.description.trim().length < 3) {
    errors.push("Descrição deve ter ao menos 3 caracteres");
  }

  if (!req.package_size || !PACKAGE_SIZES.includes(req.package_size as PackageSize)) {
    errors.push("Tamanho do pacote inválido");
  }

  if (!req.trip_id) errors.push("ID da viagem é obrigatório");

  if (req.requester_id && req.driver_id && req.requester_id === req.driver_id) {
    errors.push("Não é possível solicitar envio na própria viagem");
  }

  return { valid: errors.length === 0, errors };
}

export interface ReviewInput {
  shipment_request_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment?: string | null;
}

export function validateReview(review: ReviewInput): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    errors.push("Avaliação deve ser um número inteiro entre 1 e 5");
  }

  if (!review.shipment_request_id) errors.push("ID da solicitação é obrigatório");

  if (review.reviewer_id === review.reviewed_id) {
    errors.push("Usuário não pode avaliar a si mesmo");
  }

  if (review.comment && review.comment.length > 500) {
    errors.push("Comentário não pode ter mais de 500 caracteres");
  }

  return { valid: errors.length === 0, errors };
}

/** Regra de avaliação: envio entregue e usuário participante. */
export function canReview(
  shipmentRequest: { status: string; requester_id: string; driver_id: string },
  userId: string
): boolean {
  if (shipmentRequest.status !== "delivered") return false;
  return shipmentRequest.requester_id === userId || shipmentRequest.driver_id === userId;
}

/** Média de avaliações com uma casa decimal; null quando não há avaliações. */
export function calculateAverageRating(ratings: number[]): number | null {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
