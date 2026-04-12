import { motion } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle2, Mail, Phone, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";

const verificationSteps = [
  { icon: Mail, label: "E-mail verificado", description: "Seu e-mail foi confirmado", completed: true },
  { icon: Phone, label: "Telefone verificado", description: "Confirme seu número de telefone", completed: false },
  { icon: FileText, label: "Documento de identidade", description: "Envie um documento com foto", completed: false },
];

export default function ProfileVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const completedCount = verificationSteps.filter((s) => s.completed).length;
  const progress = (completedCount / verificationSteps.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Verificação de perfil</h1>
        </div>
      </header>

      <main className="px-4 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gradient-primary rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-primary-foreground mb-2">Perfil parcialmente verificado</h2>
          <p className="text-sm text-primary-foreground/80 mb-4">
            Complete as etapas abaixo para aumentar a confiança da comunidade
          </p>
          <div className="w-full bg-primary-foreground/20 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="bg-primary-foreground h-2 rounded-full"
            />
          </div>
          <p className="text-xs text-primary-foreground/70 mt-2">{completedCount} de {verificationSteps.length} etapas completas</p>
        </motion.div>

        <div className="space-y-3">
          {verificationSteps.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-4 ${step.completed ? "opacity-80" : ""}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.completed ? "bg-primary/10" : "bg-secondary"}`}>
                <step.icon size={22} className={step.completed ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">{step.label}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {step.completed ? (
                <CheckCircle2 size={22} className="text-primary" />
              ) : (
                <button className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  Verificar
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
