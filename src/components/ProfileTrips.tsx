import { useState, useEffect } from "react";
import { Car, MapPin, Calendar, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Trip {
  id: string;
  origin: string;
  destination: string;
  trip_date: string;
  status: string;
  suggested_price: number;
}

interface ProfileTripsProps {
  userId: string;
}

export function ProfileTrips({ userId }: ProfileTripsProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    const { data } = await supabase
      .from("trips")
      .select("id, origin, destination, trip_date, status, suggested_price")
      .eq("user_id", userId)
      .order("trip_date", { ascending: false })
      .limit(10);

    setTrips(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
  }, [userId]);

  const cancelTrip = async (id: string) => {
    const { error } = await supabase.from("trips").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar viagem");
    } else {
      toast.success("Viagem cancelada");
      fetchTrips();
    }
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-xl p-4 shadow-card border border-border"
    >
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
        <Car size={16} className="text-primary" />
        Minhas Viagens
      </h3>

      {trips.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma viagem publicada</p>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div key={trip.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <MapPin size={12} className="text-primary shrink-0" />
                  <span className="truncate">{trip.origin}</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="truncate">{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(trip.trip_date).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    R$ {trip.suggested_price}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    trip.status === "active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {trip.status === "active" ? "Ativa" : "Cancelada"}
                  </span>
                </div>
              </div>
              {trip.status === "active" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                  onClick={() => cancelTrip(trip.id)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
