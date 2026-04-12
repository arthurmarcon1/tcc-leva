import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Package, User, ArrowRight, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShipmentRequestDialog } from "@/components/ShipmentRequestDialog";

interface TripCardProps {
  id: string;
  origin: string;
  destination: string;
  date: string;
  driverName: string;
  driverAvatar?: string;
  driverUserId?: string;
  availableSpace: string;
  suggestedPrice: string;
  onClick?: () => void;
}

export function TripCard({
  id,
  origin,
  destination,
  date,
  driverName,
  driverAvatar,
  driverUserId,
  availableSpace,
  suggestedPrice,
  onClick,
}: TripCardProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const navigate = useNavigate();

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!driverUserId) {
      toast.error("Não é possível iniciar conversa com este motorista");
      return;
    }
    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        other_user_id: driverUserId,
      });
      if (error) throw error;
      navigate("/chat", { state: { conversationId: data } });
    } catch {
      toast.error("Erro ao iniciar conversa");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-xl p-4 shadow-card border border-border cursor-pointer hover:shadow-elevated transition-all duration-300"
    >
      {/* Route */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div className="w-0.5 h-8 bg-border" />
          <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{origin}</p>
          <div className="h-4" />
          <p className="font-semibold text-foreground">{destination}</p>
        </div>
        <ArrowRight className="text-muted-foreground" size={20} />
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar size={16} />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={16} />
          <span>{availableSpace}</span>
        </div>
      </div>

      {/* Driver & Price */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {driverAvatar ? (
              <img src={driverAvatar} alt={driverName} className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">{driverName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Contribuição sugerida</p>
            <p className="font-bold text-primary">{suggestedPrice}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={handleSendMessage}
          >
            <MessageCircle size={14} />
          </Button>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setShowRequestDialog(true);
            }}
          >
            <Send size={14} />
            Enviar
          </Button>
        </div>
      </div>

      <ShipmentRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        tripId={id}
        driverUserId={driverUserId || ""}
        origin={origin}
        destination={destination}
      />
    </motion.div>
  );
}
