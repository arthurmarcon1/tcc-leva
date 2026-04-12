import { useState, useEffect } from "react";
import { Bell, Check, X, Package, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface PendingRequest {
  id: string;
  description: string;
  package_size: string;
  requester_id: string;
  requester_name?: string;
  created_at: string;
}

interface TripRequestsBellProps {
  tripId: string;
}

const sizeLabels: Record<string, string> = {
  envelope: "Envelope",
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
};

export function TripRequestsBell({ tripId }: TripRequestsBellProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("shipment_requests")
      .select("id, description, package_size, requester_id, created_at")
      .eq("trip_id", tripId)
      .eq("status", "pending");

    if (!data || data.length === 0) {
      setRequests([]);
      return;
    }

    // Fetch requester names
    const requesterIds = [...new Set(data.map((r) => r.requester_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", requesterIds);

    const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

    setRequests(
      data.map((r) => ({
        ...r,
        requester_name: nameMap.get(r.requester_id) || "Usuário",
      }))
    );
  };

  useEffect(() => {
    fetchRequests();
  }, [tripId]);

  const handleAction = async (requestId: string, status: "accepted" | "rejected") => {
    setLoading(requestId + status);
    const { error } = await supabase
      .from("shipment_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao atualizar solicitação");
    } else {
      toast.success(status === "accepted" ? "Solicitação aceita!" : "Solicitação recusada");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setLoading(null);
  };

  if (requests.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
          <Bell size={16} className="text-primary" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {requests.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">
            Solicitações pendentes ({requests.length})
          </h4>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {requests.map((req) => (
            <div key={req.id} className="p-3 border-b border-border last:border-0">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {req.requester_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {req.description}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Package size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {sizeLabels[req.package_size] || req.package_size}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  disabled={loading !== null}
                  onClick={() => handleAction(req.id, "rejected")}
                >
                  <X size={12} />
                  Recusar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1"
                  disabled={loading !== null}
                  onClick={() => handleAction(req.id, "accepted")}
                >
                  <Check size={12} />
                  Aceitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
