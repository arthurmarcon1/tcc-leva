import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, X, Loader2, PackageSearch } from "lucide-react";
import { Header } from "@/components/Header";
import { TripCard } from "@/components/TripCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";

const packageLabels: Record<string, string> = {
  envelope: "Envelope",
  small: "Caixa pequena",
  medium: "Caixa média",
  large: "Bagagem grande",
};

const packageFilters = [
  { key: "envelope", label: "Envelope" },
  { key: "small", label: "Pequeno" },
  { key: "medium", label: "Médio" },
  { key: "large", label: "Grande" },
];

const dateFilters = ["Hoje", "Esta semana", "Menor preço"];

interface TripWithProfile {
  id: string;
  origin: string;
  destination: string;
  trip_date: string;
  trip_time: string | null;
  package_size: string;
  suggested_price: number;
  user_id: string;
  driverName: string;
  driverAvatar: string | null;
  driverRating: number | null;
  driverRatingCount: number;
}

export default function Search() {
  const location = useLocation();
  const navState = location.state as { origin?: string; destination?: string; mode?: string } | null;
  const isSendMode = navState?.mode === "send";
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState(navState?.origin || "");
  const [destinationFilter, setDestinationFilter] = useState(navState?.destination || "");
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [activePackageFilter, setActivePackageFilter] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("trips")
      .select("*")
      .eq("status", "active")
      .gte("trip_date", today);

    if (activeDateFilter === "Hoje") {
      query = query.eq("trip_date", today);
    } else if (activeDateFilter === "Esta semana") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query = query.lte("trip_date", nextWeek.toISOString().split("T")[0]);
    }

    if (activeDateFilter === "Menor preço") {
      query = query.order("suggested_price", { ascending: true });
    } else {
      query = query.order("trip_date", { ascending: true });
    }

    const { data: tripsData, error } = await query;
    if (error || !tripsData) { setLoading(false); return; }

    const userIds = [...new Set(tripsData.map((t) => t.user_id))];

    const [profilesRes, ratingsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
        : { data: [] },
      userIds.length > 0
        ? supabase.from("reviews").select("reviewed_id, rating").in("reviewed_id", userIds)
        : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));

    // Compute avg rating per driver
    const ratingAcc = new Map<string, { sum: number; count: number }>();
    for (const r of (ratingsRes.data || [])) {
      const curr = ratingAcc.get(r.reviewed_id) ?? { sum: 0, count: 0 };
      ratingAcc.set(r.reviewed_id, { sum: curr.sum + r.rating, count: curr.count + 1 });
    }

    setTrips(
      tripsData.map((t) => {
        const p = profileMap.get(t.user_id);
        const rd = ratingAcc.get(t.user_id);
        return {
          ...t,
          driverName: p?.full_name || "Usuário",
          driverAvatar: p?.avatar_url || null,
          driverRating: rd ? Math.round((rd.sum / rd.count) * 10) / 10 : null,
          driverRatingCount: rd?.count ?? 0,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, [activeDateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const channel = supabase
      .channel("trips-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => fetchTrips())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeDateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTrips = trips.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = !originFilter ||
      t.origin.toLowerCase().includes(originFilter.toLowerCase());
    const matchesDestination = !destinationFilter ||
      t.destination.toLowerCase().includes(destinationFilter.toLowerCase());
    const matchesPackage = !activePackageFilter || t.package_size === activePackageFilter;
    return matchesSearch && matchesOrigin && matchesDestination && matchesPackage;
  });

  const formatTripDate = (date: string, time: string | null) => {
    try {
      const d = new Date(date + "T00:00:00");
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      let label = d.getTime() === today.getTime() ? "Hoje"
        : d.getTime() === tomorrow.getTime() ? "Amanhã"
        : format(d, "EEE, dd/MM", { locale: ptBR });
      if (time) label += `, ${time.slice(0, 5)}`;
      return label;
    } catch { return date; }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={isSendMode ? "Enviar encomenda" : "Buscar"} showLocation={false} />
      <main className="px-4 space-y-4">
        {isSendMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/8 border border-primary/20"
          >
            <PackageSearch size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary font-medium leading-snug">
              Encontre uma viagem compatível com sua encomenda e clique em{" "}
              <span className="font-bold">Enviar</span> para solicitar o transporte.
            </p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card shadow-card border border-border">
            <SearchIcon size={20} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar cidade ou rota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X size={18} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Active city filters */}
        {(originFilter || destinationFilter) && (
          <div className="flex flex-wrap gap-2">
            {originFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                De: {originFilter}
                <button onClick={() => setOriginFilter("")}><X size={14} /></button>
              </span>
            )}
            {destinationFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Para: {destinationFilter}
                <button onClick={() => setDestinationFilter("")}><X size={14} /></button>
              </span>
            )}
          </div>
        )}

        {/* Date / sort filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {dateFilters.map((filter) => (
            <Button
              key={filter}
              variant={activeDateFilter === filter ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveDateFilter(activeDateFilter === filter ? null : filter)}
              className="shrink-0"
            >
              {filter}
            </Button>
          ))}
        </motion.div>

        {/* Package size filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {packageFilters.map((pf) => (
            <Button
              key={pf.key}
              variant={activePackageFilter === pf.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActivePackageFilter(activePackageFilter === pf.key ? null : pf.key)}
              className="shrink-0 text-xs"
            >
              {pf.label}
            </Button>
          ))}
        </motion.div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {filteredTrips.length} viagen{filteredTrips.length !== 1 ? "s" : ""} encontrada{filteredTrips.length !== 1 ? "s" : ""}
              </p>
              <AnimatePresence mode="popLayout">
                {filteredTrips.map((trip, index) => (
                  <motion.div key={trip.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: 0.05 * index }}>
                    <TripCard
                      id={trip.id}
                      origin={trip.origin}
                      destination={trip.destination}
                      date={formatTripDate(trip.trip_date, trip.trip_time)}
                      driverName={trip.driverName}
                      driverAvatar={trip.driverAvatar || undefined}
                      driverUserId={trip.user_id}
                      availableSpace={packageLabels[trip.package_size] || trip.package_size}
                      suggestedPrice={`R$ ${Number(trip.suggested_price).toFixed(0)}`}
                      driverRating={trip.driverRating}
                      driverRatingCount={trip.driverRatingCount}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredTrips.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <SearchIcon size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Nenhuma viagem encontrada</h3>
                  <p className="text-sm text-muted-foreground">Tente buscar por outra cidade ou publique sua viagem</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
