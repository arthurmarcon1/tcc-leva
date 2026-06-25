import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Package,
  DollarSign,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TripRequestsBell } from "@/components/TripRequestsBell";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateTrip, todayISO } from "@/lib/validation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Trip {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  trip_date: string;
  trip_time: string | null;
  package_size: string;
  suggested_price: number;
  notes: string | null;
  status: string;
}

const packageSizes = [
  { id: "envelope", label: "Envelope", description: "Documentos, cartas" },
  { id: "small", label: "Pequeno", description: "Até 30x20x10cm" },
  { id: "medium", label: "Médio", description: "Até 50x40x30cm" },
  { id: "large", label: "Grande", description: "Mala, caixa grande" },
];

const tripStatusMeta: Record<string, { label: string; className: string }> = {
  active: { label: "Agendada", className: "bg-primary/15 text-primary border-primary/20" },
  confirmed: { label: "Confirmada", className: "bg-accent/15 text-accent-foreground border-accent/20" },
  in_progress: { label: "Em andamento", className: "bg-primary/20 text-primary border-primary/30" },
  completed: { label: "Concluída", className: "bg-green-500/15 text-green-600 border-green-500/20" },
  cancelled: { label: "Cancelada", className: "bg-destructive/15 text-destructive border-destructive/20" },
};

function getPackageLabel(id: string) {
  return packageSizes.find((s) => s.id === id)?.label ?? id;
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  interface Participant {
    shipmentId: string;
    requesterId: string;
    requesterName: string;
    requesterAvatar: string | null;
    description: string;
    status: string;
  }
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<{
    shipmentId: string;
    reviewedId: string;
    reviewedName: string;
  } | null>(null);

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    date: "",
    time: "",
    packageSize: "",
    suggestedPrice: "",
    notes: "",
  });

  useEffect(() => {
    if (!id) return;
    supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setTrip(data as Trip);
        }
        setLoading(false);
      });
  }, [id]);

  const fetchParticipants = async () => {
    if (!id || !user) return;
    const { data: requests } = await supabase
      .from("shipment_requests")
      .select("id, requester_id, description, status")
      .eq("trip_id", id)
      .in("status", ["accepted", "in_transit", "delivered"]);

    if (!requests?.length) return;

    const userIds = requests.map((r) => r.requester_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    setParticipants(
      requests.map((r) => ({
        shipmentId: r.id,
        requesterId: r.requester_id,
        requesterName: profileMap.get(r.requester_id)?.full_name || "Usuário",
        requesterAvatar: profileMap.get(r.requester_id)?.avatar_url || null,
        description: r.description,
        status: r.status,
      }))
    );

    const { data: reviews } = await supabase
      .from("reviews")
      .select("shipment_request_id")
      .eq("reviewer_id", user.id)
      .in("shipment_request_id", requests.map((r) => r.id));

    if (reviews) {
      setExistingReviews(new Set(reviews.map((r) => r.shipment_request_id)));
    }
  };

  useEffect(() => {
    fetchParticipants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const editTimeError = (() => {
    if (!editing || !form.time || form.date !== todayISO()) return null;
    const [h, m] = form.time.split(":").map(Number);
    const chosen = new Date(); chosen.setHours(h, m, 0, 0);
    return chosen <= new Date() ? "Este horário já passou. Escolha um horário futuro." : null;
  })();

  const editPriceNum = parseFloat(form.suggestedPrice);
  const editPriceError = editing && form.suggestedPrice !== ""
    ? editPriceNum < 0
      ? "A contribuição não pode ser negativa."
      : editPriceNum > 9999
      ? "O valor máximo permitido é R$ 9.999."
      : null
    : null;

  const startEditing = () => {
    if (!trip) return;
    setForm({
      origin: trip.origin,
      destination: trip.destination,
      date: trip.trip_date,
      time: trip.trip_time ?? "",
      packageSize: trip.package_size,
      suggestedPrice: String(trip.suggested_price),
      notes: trip.notes ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!trip || !id) return;
    const validation = validateTrip({
      origin: form.origin,
      destination: form.destination,
      trip_date: form.date,
      trip_time: form.time || null,
      package_size: form.packageSize,
      suggested_price: parseFloat(form.suggestedPrice) || 0,
    });
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("trips")
      .update({
        origin: form.origin,
        destination: form.destination,
        trip_date: form.date,
        trip_time: form.time || null,
        package_size: form.packageSize,
        suggested_price: parseFloat(form.suggestedPrice) || 0,
        notes: form.notes || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Viagem atualizada");
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              origin: form.origin,
              destination: form.destination,
              trip_date: form.date,
              trip_time: form.time || null,
              package_size: form.packageSize,
              suggested_price: parseFloat(form.suggestedPrice) || 0,
              notes: form.notes || null,
            }
          : null
      );
      setEditing(false);
    }
  };

  const handleCancelInstead = async () => {
    if (!id) return;
    const { error } = await supabase
      .from("trips")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar viagem");
    } else {
      toast.success("Viagem cancelada");
      navigate("/");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) {
      toast.error("Não é possível excluir esta viagem.", {
        description:
          "Ela possui solicitações vinculadas. Você pode cancelá-la em vez de excluí-la.",
        action: { label: "Cancelar viagem", onClick: handleCancelInstead },
        duration: 8000,
      });
    } else {
      toast.success("Viagem excluída");
      navigate("/");
    }
  };

  if (loading) return null;

  if (notFound || (trip && user && trip.user_id !== user.id)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center">
          Esta viagem não foi encontrada ou não pertence à sua conta.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para a home
        </Button>
      </div>
    );
  }

  if (!trip) return null;

  const status = tripStatusMeta[trip.status] ?? tripStatusMeta.active;
  const canEdit = trip.status !== "cancelled" && trip.status !== "completed";

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header showLocation={false} />

      <main className="px-4 space-y-4">
        {/* Cabeçalho: voltar + status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pt-1"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <TripRequestsBell tripId={trip.id} />
            <Badge className={`text-[11px] font-semibold border ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </motion.div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl overflow-hidden border border-primary/20 bg-card shadow-elevated"
        >
          <div className="h-1.5 gradient-primary w-full" />
          <div className="p-5 space-y-5">

            {/* Título + botões de edição */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-lg">Detalhe da viagem</h2>
              {canEdit && !editing && (
                <Button size="sm" variant="outline" onClick={startEditing} className="gap-1.5">
                  <Pencil size={14} />
                  Editar
                </Button>
              )}
              {editing && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    className="gap-1"
                  >
                    <X size={14} />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !!editTimeError || !!editPriceError} className="gap-1">
                    <Check size={14} />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </div>

            {/* Rota */}
            {editing ? (
              <div className="space-y-2">
                <div className="bg-secondary/40 rounded-xl p-1">
                  <CityAutocomplete
                    value={form.origin}
                    onChange={(v) => setForm({ ...form, origin: v })}
                    placeholder="Cidade de origem"
                    icon="origin"
                  />
                </div>
                <div className="bg-secondary/40 rounded-xl p-1">
                  <CityAutocomplete
                    value={form.destination}
                    onChange={(v) => setForm({ ...form, destination: v })}
                    placeholder="Cidade de destino"
                    icon="destination"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="w-0.5 h-8 bg-primary/30" />
                  <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[15px] truncate">{trip.origin}</p>
                  <div className="h-4" />
                  <p className="font-semibold text-foreground text-[15px] truncate">{trip.destination}</p>
                </div>
              </div>
            )}

            {/* Data e Horário */}
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                    <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent",
                            !form.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon size={16} className="mr-2 shrink-0" />
                          {form.date
                            ? format(new Date(form.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                            : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.date ? new Date(form.date + "T12:00:00") : undefined}
                          onSelect={(date) =>
                            setForm({ ...form, date: date ? format(date, "yyyy-MM-dd") : "" })
                          }
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          locale={ptBR}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className={`p-4 rounded-xl bg-secondary/40 border ${editTimeError ? "border-destructive" : "border-border"}`}>
                    <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full bg-transparent outline-none text-foreground"
                    />
                  </div>
                </div>
                {editTimeError && (
                  <p className="text-xs text-destructive">{editTimeError}</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon size={14} />
                  <span>{new Date(trip.trip_date).toLocaleDateString("pt-BR")}</span>
                </div>
                {trip.trip_time && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{trip.trip_time.slice(0, 5)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tamanho do pacote */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <Package size={13} />
                Espaço disponível
              </p>
              {editing ? (
                <div className="space-y-2">
                  {packageSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setForm({ ...form, packageSize: size.id })}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        form.packageSize === size.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{size.label}</p>
                          <p className="text-xs text-muted-foreground">{size.description}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            form.packageSize === size.id
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {form.packageSize === size.id && (
                            <Check size={12} className="text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-foreground font-medium">{getPackageLabel(trip.package_size)}</p>
              )}
            </div>

            {/* Contribuição sugerida */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <DollarSign size={13} />
                Contribuição sugerida
              </p>
              {editing ? (
                <>
                  <div className={`flex items-center gap-2 p-3 rounded-xl bg-secondary/40 border ${editPriceError ? "border-destructive" : "border-border"}`}>
                    <span className="text-foreground font-semibold">R$</span>
                    <input
                      type="number"
                      value={form.suggestedPrice}
                      onChange={(e) => setForm({ ...form, suggestedPrice: e.target.value })}
                      min="0"
                      max="9999"
                      step="0.01"
                      className="flex-1 bg-transparent outline-none text-foreground font-bold text-lg"
                    />
                  </div>
                  {editPriceError && (
                    <p className="text-xs text-destructive mt-1">{editPriceError}</p>
                  )}
                </>
              ) : (
                <p className="font-bold text-lg text-primary">R$ {trip.suggested_price}</p>
              )}
            </div>

            {/* Observações */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Observações</p>
              {editing ? (
                <>
                  <textarea
                    maxLength={300}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observações opcionais..."
                    rows={3}
                    className="w-full bg-secondary/40 rounded-xl p-3 border border-border outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm"
                  />
                  {form.notes.length > 220 && (
                    <p className={`text-xs text-right mt-1 ${form.notes.length >= 300 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {form.notes.length}/300
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm">
                  {trip.notes ? (
                    <span className="text-foreground">{trip.notes}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Nenhuma observação</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Participantes da viagem */}
        {participants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Users size={15} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Participantes da viagem</h3>
            </div>
            <div className="divide-y divide-border">
              {participants.map((p) => (
                <div key={p.shipmentId} className="px-5 py-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={p.requesterAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {p.requesterName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{p.requesterName}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  </div>
                  {p.status === "delivered" && !existingReviews.has(p.shipmentId) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      onClick={() =>
                        setReviewTarget({
                          shipmentId: p.shipmentId,
                          reviewedId: p.requesterId,
                          reviewedName: p.requesterName,
                        })
                      }
                    >
                      <Star size={13} />
                      Avaliar
                    </Button>
                  )}
                  {p.status === "delivered" && existingReviews.has(p.shipmentId) && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                      <CheckCircle2 size={13} />
                      Avaliado
                    </span>
                  )}
                  {p.status !== "delivered" && (
                    <span className="text-xs text-muted-foreground shrink-0 capitalize">
                      {p.status === "accepted" ? "Aceito" : p.status === "in_transit" ? "Em trânsito" : p.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Excluir viagem */}
        {canEdit && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                Excluir viagem
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta viagem?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Se a viagem tiver solicitações vinculadas, a
                    exclusão não será permitida — nesse caso você poderá cancelá-la em vez disso.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    onClick={handleDelete}
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </main>

      <ReviewDialog
        open={!!reviewTarget}
        onOpenChange={(open) => !open && setReviewTarget(null)}
        shipmentRequestId={reviewTarget?.shipmentId || ""}
        reviewedId={reviewTarget?.reviewedId || ""}
        reviewedName={reviewTarget?.reviewedName || ""}
        onReviewSubmitted={fetchParticipants}
      />

      <BottomNav />
    </div>
  );
}
