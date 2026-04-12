import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Mail, FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const helpItems = [
  { icon: FileText, label: "Perguntas frequentes", description: "Respostas para dúvidas comuns" },
  { icon: MessageCircle, label: "Fale conosco", description: "Entre em contato pelo chat" },
  { icon: Mail, label: "Enviar e-mail", description: "suporte@leva.app" },
];

export default function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Ajuda e suporte</h1>
        </div>
      </header>

      <main className="px-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          {helpItems.map((item, index) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors ${index !== helpItems.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <item.icon size={18} className="text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground text-sm">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          ))}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
