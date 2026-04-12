import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Package, Loader2 } from "lucide-react";

const packageSizes = [
  { id: "envelope", label: "Envelope" },
  { id: "small", label: "Caixa pequena" },
  { id: "medium", label: "Caixa média" },
  { id: "large", label: "Bagagem grande" },
];

interface ShipmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  driverUserId: string;
  origin: string;
  destination: string;
}

export function ShipmentRequestDialog({
  open,
  onOpenChange,
  tripId,
  driverUserId,
  origin,
  destination,
}: ShipmentRequestDialogProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [packageSize, setPackageSize] = useState("small");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !description.trim()) {
      toast.error("Descreva o que deseja enviar");
      return;
    }

    if (user.id === driverUserId) {
      toast.error("Você não pode solicitar envio na sua própria viagem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("shipment_requests").insert({
      trip_id: tripId,
      requester_id: user.id,
      driver_id: driverUserId,
      description: description.trim(),
      package_size: packageSize,
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao solicitar envio");
      return;
    }

    toast.success("Solicitação enviada com sucesso!");
    setDescription("");
    setPackageSize("small");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Envio</DialogTitle>
          <DialogDescription>
            {origin} → {destination}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>O que deseja enviar?</Label>
            <Input
              placeholder="Ex: Caixa com documentos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tamanho do pacote</Label>
            <div className="grid grid-cols-2 gap-2">
              {packageSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setPackageSize(size.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    packageSize === size.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Package size={14} />
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !description.trim()} className="w-full">
            {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Enviar Solicitação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
