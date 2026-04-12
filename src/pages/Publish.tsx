import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar as CalendarIcon, Package, DollarSign, ArrowRight, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const packageSizes = [
  { id: "envelope", label: "Envelope", description: "Documentos, cartas" },
  { id: "small", label: "Pequeno", description: "Até 30x20x10cm" },
  { id: "medium", label: "Médio", description: "Até 50x40x30cm" },
  { id: "large", label: "Grande", description: "Mala, caixa grande" },
];

export default function Publish() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    date: "",
    time: "",
    packageSize: "",
    suggestedPrice: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("trips").insert({
        user_id: user.id,
        origin: formData.origin,
        destination: formData.destination,
        trip_date: formData.date,
        trip_time: formData.time || null,
        package_size: formData.packageSize,
        suggested_price: parseFloat(formData.suggestedPrice) || 0,
        notes: formData.notes || null,
      });
      if (error) throw error;
      toast({
        title: "Viagem publicada!",
        description: "Sua viagem está disponível para envios.",
      });
      navigate("/search");
    } catch (err) {
      toast({
        title: "Erro ao publicar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Publicar viagem" showLocation={false} />

      <main className="px-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    step > s ? "bg-primary" : "bg-secondary"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Route */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground mb-4">
              Qual é sua rota?
            </h2>

            <div className="space-y-3">
              <div className="bg-card shadow-card border border-border rounded-xl p-1">
                <CityAutocomplete
                  value={formData.origin}
                  onChange={(value) => setFormData({ ...formData, origin: value })}
                  placeholder="Cidade de origem"
                  icon="origin"
                />
              </div>

              <div className="bg-card shadow-card border border-border rounded-xl p-1">
                <CityAutocomplete
                  value={formData.destination}
                  onChange={(value) => setFormData({ ...formData, destination: value })}
                  placeholder="Cidade de destino"
                  icon="destination"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-card shadow-card border border-border">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Data
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon size={16} className="mr-2 shrink-0" />
                      {formData.date
                        ? format(new Date(formData.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date + "T12:00:00") : undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          date: date ? format(date, "yyyy-MM-dd") : "",
                        })
                      }
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={ptBR}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="p-4 rounded-xl bg-card shadow-card border border-border">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Horário
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="w-full bg-transparent outline-none text-foreground"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.origin || !formData.destination || !formData.date}
              className="w-full mt-4"
              size="lg"
            >
              Continuar
              <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Package */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground mb-4">
              Qual espaço disponível?
            </h2>

            <div className="space-y-2">
              {packageSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() =>
                    setFormData({ ...formData, packageSize: size.id })
                  }
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.packageSize === size.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {size.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {size.description}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.packageSize === size.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {formData.packageSize === size.id && (
                        <Check size={14} className="text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!formData.packageSize}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Price */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground mb-4">
              Contribuição sugerida
            </h2>

            <p className="text-sm text-muted-foreground">
              Defina um valor para ajudar nos custos da viagem. Lembre-se: somos
              uma comunidade colaborativa!
            </p>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-card shadow-card border border-border">
              <DollarSign size={20} className="text-primary" />
              <span className="text-lg font-semibold text-foreground">R$</span>
              <input
                type="number"
                placeholder="0"
                value={formData.suggestedPrice}
                onChange={(e) =>
                  setFormData({ ...formData, suggestedPrice: e.target.value })
                }
                className="flex-1 bg-transparent outline-none text-2xl font-bold text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="p-4 rounded-xl bg-card shadow-card border border-border">
              <label className="text-sm text-muted-foreground mb-2 block">
                Observações (opcional)
              </label>
              <textarea
                placeholder="Ex: Aceito apenas objetos leves, disponibilidade flexível..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
              <h3 className="font-semibold text-foreground">Resumo</h3>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-primary" />
                <span className="text-foreground">
                  {formData.origin} → {formData.destination}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon size={16} className="text-primary" />
                <span className="text-foreground">
                  {formData.date} às {formData.time}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package size={16} className="text-primary" />
                <span className="text-foreground">
                  {packageSizes.find((s) => s.id === formData.packageSize)?.label}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleSubmit} variant="hero" className="flex-1" disabled={submitting}>
                {submitting ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
