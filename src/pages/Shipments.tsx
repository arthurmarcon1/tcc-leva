import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, CheckCircle2, XCircle, Truck, Loader2, Check, X, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog } from "@/components/ReviewDialog";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-accent/10 text-accent", icon: Clock },
  accepted: { label: "Aceito", color: "bg-primary/10 text-primary", icon: Package },
  in_transit: { label: "Em trânsito", color: "bg-primary/10 text-primary", icon: Truck },
  delivered: { label: "Entregue", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  rejected: { label: "Recusado", color: "bg-destructive/10 text-destructive", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

interface ShipmentRequest {
  id: string;
  trip_id: string;
  requester_id: string;
  driver_id: string;
  description: string;
  package_size: string;
  status: string;
  created_at: string;
  origin?: string;
  destination?: string;
  trip_date?: string;
  requester_name?: string;
  driver_name?: string;
}

export default function Shipments() {
  const { user } = useAuth();
  const [sentRequests, setSentRequests] = useState<ShipmentRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ShipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<{
    shipmentId: string;
    reviewedId: string;
    reviewedName: string;
  } | null>(null);
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch sent requests (as requester)
    const { data: sent } = await supabase
      .from("shipment_requests")
      .select("*")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch received requests (as driver)
    const { data: received } = await supabase
      .from("shipment_requests")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });

    const allRequests = [...(sent || []), ...(received || [])];
    const tripIds = [...new Set(allRequests.map((r) => r.trip_id))];
    const userIds = [...new Set(allRequests.flatMap((r) => [r.requester_id, r.driver_id]))];

    const { data: trips } = tripIds.length > 0
      ? await supabase.from("trips").select("id, origin, destination, trip_date").in("id", tripIds)
      : { data: [] };

    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
      : { data: [] };

    const tripMap = new Map((trips || []).map((t) => [t.id, t]));
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const enrich = (r: any): ShipmentRequest => {
      const trip = tripMap.get(r.trip_id);
      return {
        ...r,
        origin: trip?.origin || "—",
        destination: trip?.destination || "—",
        trip_date: trip?.trip_date || "",
        requester_name: profileMap.get(r.requester_id)?.full_name || "Usuário",
        driver_name: profileMap.get(r.driver_id)?.full_name || "Motorista",
      };
    };

    setSentRequests((sent || []).map(enrich));
    setReceivedRequests((received || []).map(enrich));
    setLoading(false);
  };

  const fetchExistingReviews = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("shipment_request_id, reviewer_id")
      .eq("reviewer_id", user.id);
    if (data) {
      setExistingReviews(new Set(data.map((r) => r.shipment_request_id)));
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchExistingReviews();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shipment-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipment_requests" }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("shipment_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Solicitação ${status === "accepted" ? "aceita" : status === "rejected" ? "recusada" : "atualizada"}!`);
      fetchRequests();
    }
  };

  const sentStats = {
    total: sentRequests.length,
    pending: sentRequests.filter((r) => r.status === "pending").length,
    active: sentRequests.filter((r) => ["accepted", "in_transit"].includes(r.status)).length,
    delivered: sentRequests.filter((r) => r.status === "delivered").length,
  };

  const receivedStats = {
    total: receivedRequests.length,
    pending: receivedRequests.filter((r) => r.status === "pending").length,
  };

  const renderCard = (request: ShipmentRequest, isDriver: boolean) => {
    const config = statusConfig[request.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <motion.div
        key={request.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 shadow-card border border-border"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{request.description}</p>
              <p className="text-xs text-muted-foreground">
                {isDriver ? `De: ${request.requester_name}` : `Motorista: ${request.driver_name}`}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <StatusIcon size={12} />
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{request.origin}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full border border-primary" />
            <span className="text-muted-foreground">{request.destination}</span>
          </div>
        </div>

        {/* Driver actions for pending requests */}
        {isDriver && request.status === "pending" && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={() => updateStatus(request.id, "accepted")}>
              <Check size={14} /> Aceitar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => updateStatus(request.id, "rejected")}>
              <X size={14} /> Recusar
            </Button>
          </div>
        )}

        {/* Driver actions for accepted requests */}
        {isDriver && request.status === "accepted" && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={() => updateStatus(request.id, "in_transit")}>
              <Truck size={14} /> Marcar em trânsito
            </Button>
          </div>
        )}

        {/* Driver actions for in_transit */}
        {isDriver && request.status === "in_transit" && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={() => updateStatus(request.id, "delivered")}>
              <CheckCircle2 size={14} /> Marcar entregue
            </Button>
          </div>
        )}

        {/* Requester can cancel pending */}
        {!isDriver && request.status === "pending" && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => updateStatus(request.id, "cancelled")}>
              <XCircle size={14} /> Cancelar solicitação
            </Button>
          </div>
        )}

        {/* Review button for delivered requests */}
        {request.status === "delivered" && !existingReviews.has(request.id) && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1"
              onClick={() =>
                setReviewTarget({
                  shipmentId: request.id,
                  reviewedId: isDriver ? request.requester_id : request.driver_id,
                  reviewedName: isDriver ? (request.requester_name || "Remetente") : (request.driver_name || "Motorista"),
                })
              }
            >
              <Star size={14} /> Avaliar {isDriver ? "remetente" : "motorista"}
            </Button>
          </div>
        )}

        {request.status === "delivered" && existingReviews.has(request.id) && (
          <div className="mt-3 pt-3 border-t border-border text-center">
            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle2 size={12} /> Avaliação enviada
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  const renderEmpty = (message: string) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
        <Package size={24} className="text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground">
        Encontre uma viagem e envie sua primeira encomenda
      </p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Meus Envios" showLocation={false} />

      <main className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Tabs defaultValue="sent" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="sent">
                Enviados {sentStats.total > 0 && `(${sentStats.total})`}
              </TabsTrigger>
              <TabsTrigger value="received">
                Recebidos {receivedStats.total > 0 && `(${receivedStats.total})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sent">
              {/* Stats */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-card rounded-xl p-4 text-center shadow-card border border-border">
                  <p className="text-2xl font-bold text-primary">{sentStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center shadow-card border border-border">
                  <p className="text-2xl font-bold text-accent">{sentStats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center shadow-card border border-border">
                  <p className="text-2xl font-bold text-green-600">{sentStats.delivered}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
              </motion.div>

              <div className="space-y-3">
                <AnimatePresence>
                  {sentRequests.map((r) => renderCard(r, false))}
                </AnimatePresence>
                {sentRequests.length === 0 && renderEmpty("Nenhum envio ainda")}
              </div>
            </TabsContent>

            <TabsContent value="received">
              {receivedStats.pending > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-sm font-medium text-accent">
                    {receivedStats.pending} solicitação(ões) pendente(s)
                  </p>
                </motion.div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {receivedRequests.map((r) => renderCard(r, true))}
                </AnimatePresence>
                {receivedRequests.length === 0 && renderEmpty("Nenhuma solicitação recebida")}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <ReviewDialog
        open={!!reviewTarget}
        onOpenChange={(open) => !open && setReviewTarget(null)}
        shipmentRequestId={reviewTarget?.shipmentId || ""}
        reviewedId={reviewTarget?.reviewedId || ""}
        reviewedName={reviewTarget?.reviewedName || ""}
        onReviewSubmitted={fetchExistingReviews}
      />

      <BottomNav />
    </div>
  );
}
