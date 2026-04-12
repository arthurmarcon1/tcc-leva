import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  Search,
  PlusCircle,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRight,
  MessageCircle,
  Clock,
} from "lucide-react";
import { TripRequestsBell } from "@/components/TripRequestsBell";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Trip {
  id: string;
  origin: string;
  destination: string;
  trip_date: string;
  status: string;
  suggested_price: number;
  trip_time: string | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  active: {
    label: "Agendada",
    className: "bg-primary/15 text-primary border-primary/20",
  },
  confirmed: {
    label: "Confirmada",
    className: "bg-accent/15 text-accent-foreground border-accent/20",
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-primary/20 text-primary border-primary/30",
  },
};

function getStatusBadge(status: string) {
  const s = statusLabels[status] || statusLabels.active;
  return s;
}

function isUpcoming(tripDate: string) {
  return new Date(tripDate + "T23:59:59") >= new Date();
}

function isPast(tripDate: string) {
  return new Date(tripDate + "T23:59:59") < new Date();
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("trips")
      .select("id, origin, destination, trip_date, status, suggested_price, trip_time")
      .eq("user_id", user.id)
      .order("trip_date", { ascending: true })
      .then(({ data }) => {
        setAllTrips(data || []);
        setLoading(false);
      });
  }, [user]);

  // Split trips
  const activeTrip = allTrips.find(
    (t) => (t.status === "in_progress" || t.status === "confirmed") && isUpcoming(t.trip_date)
  );
  const upcomingTrips = allTrips.filter(
    (t) => t.status === "active" && isUpcoming(t.trip_date) && t.id !== activeTrip?.id
  );
  const pastTrips = allTrips.filter((t) => isPast(t.trip_date) || t.status === "completed");

  const hasTrips = activeTrip || upcomingTrips.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="px-4 space-y-5">
        {/* ── State: No trips → show search ── */}
        {!loading && !hasTrips && (
          <>
            <motion.section {...fadeUp} className="gradient-hero rounded-2xl p-6 -mx-0">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Envie suas encomendas com quem já vai viajar
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Economia colaborativa e sustentável
              </p>
              <SearchBar
                onSearch={(origin, destination) =>
                  navigate("/search", { state: { origin, destination } })
                }
              />
            </motion.section>

            {/* Quick actions */}
            <QuickActions navigate={navigate} />

            {/* Past trips if any */}
            {pastTrips.length > 0 && <TripHistory trips={pastTrips} navigate={navigate} />}
          </>
        )}

        {/* ── State: Has trips → dashboard ── */}
        {!loading && hasTrips && (
          <>
            {/* Active / main trip */}
            {activeTrip && <ActiveTripCard trip={activeTrip} navigate={navigate} />}

            {/* If no active but has upcoming, promote the first */}
            {!activeTrip && upcomingTrips.length > 0 && (
              <ActiveTripCard trip={upcomingTrips[0]} navigate={navigate} />
            )}

            {/* Upcoming trips */}
            {upcomingTrips.length > (activeTrip ? 0 : 1) && (
              <motion.section {...fadeUp} transition={{ delay: 0.1 }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Calendar size={15} className="text-primary" />
                    Próximas viagens
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {(activeTrip ? upcomingTrips : upcomingTrips.slice(1)).map((trip) => (
                    <UpcomingTripRow key={trip.id} trip={trip} navigate={navigate} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Quick actions */}
            <QuickActions navigate={navigate} />

            {/* History */}
            {pastTrips.length > 0 && <TripHistory trips={pastTrips} navigate={navigate} />}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* ─────────── Active Trip Card ─────────── */
function ActiveTripCard({ trip, navigate }: { trip: Trip; navigate: ReturnType<typeof useNavigate> }) {
  const badge = getStatusBadge(trip.status);

  return (
    <motion.section
      {...fadeUp}
      className="rounded-2xl overflow-hidden border border-primary/20 bg-card shadow-elevated"
    >
      {/* Green accent bar */}
      <div className="h-1.5 gradient-primary w-full" />

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-base">Viagem em andamento</h3>
          <Badge className={`text-[11px] font-semibold border ${badge.className}`}>
            {badge.label}
          </Badge>
        </div>

        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
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

        {/* Meta row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{new Date(trip.trip_date).toLocaleDateString("pt-BR")}</span>
          </div>
          <span className="font-bold text-primary text-base">
            R$ {trip.suggested_price}
          </span>
          <div className="ml-auto">
            <TripRequestsBell tripId={trip.id} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <Button
            className="flex-1"
            onClick={() => navigate("/shipments")}
          >
            Ver detalhes
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => navigate("/chat")}
          >
            <MessageCircle size={16} />
            Chat
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

/* ─────────── Upcoming Trip Row ─────────── */
function UpcomingTripRow({ trip, navigate }: { trip: Trip; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/shipments")}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <MapPin size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <span className="truncate">{trip.origin}</span>
          <ArrowRight size={12} className="text-muted-foreground shrink-0 mx-0.5" />
          <span className="truncate">{trip.destination}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {new Date(trip.trip_date).toLocaleDateString("pt-BR")}
          </span>
          <span className="text-xs font-semibold text-primary">
            R$ {trip.suggested_price}
          </span>
        </div>
      </div>
      <TripRequestsBell tripId={trip.id} />
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </motion.div>
  );
}

/* ─────────── Quick Actions ─────────── */
function QuickActions({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const actions = [
    {
      icon: Search,
      label: "Buscar viagem",
      onClick: () => navigate("/search"),
    },
    {
      icon: PlusCircle,
      label: "Criar viagem",
      onClick: () => navigate("/publish"),
    },
    {
      icon: Package,
      label: "Enviar encomenda",
      onClick: () => navigate("/search"),
    },
  ];

  return (
    <motion.section {...fadeUp} transition={{ delay: 0.15 }}>
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <action.icon size={20} className="text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

/* ─────────── Trip History ─────────── */
function TripHistory({
  trips,
  navigate,
}: {
  trips: Trip[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? trips : trips.slice(0, 3);

  return (
    <motion.section {...fadeUp} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock size={15} className="text-muted-foreground" />
          Histórico de viagens
        </h3>
        {trips.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-primary font-medium flex items-center gap-0.5"
          >
            {showAll ? "Ver menos" : "Ver todas"} <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visible.map((trip) => (
          <div
            key={trip.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/50"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Truck size={14} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm text-foreground">
                <span className="truncate font-medium">{trip.origin}</span>
                <ArrowRight size={10} className="text-muted-foreground shrink-0 mx-0.5" />
                <span className="truncate font-medium">{trip.destination}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(trip.trip_date).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              R$ {trip.suggested_price}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
