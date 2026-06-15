import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "pt-BR");

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem("language", value);
    if (value !== "pt-BR") {
      toast.info("Suporte a outros idiomas estará disponível em breve.");
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        </div>
      </header>

      <main className="px-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                {darkMode ? <Moon size={18} className="text-foreground" /> : <Sun size={18} className="text-foreground" />}
              </div>
              <div>
                <Label className="font-medium text-foreground">Modo escuro</Label>
                <p className="text-xs text-muted-foreground">Alternar entre claro e escuro</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Globe size={18} className="text-foreground" />
              </div>
              <div>
                <Label className="font-medium text-foreground">Idioma</Label>
                <p className="text-xs text-muted-foreground">Idioma do aplicativo</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-secondary text-foreground text-sm rounded-lg px-3 py-2 border border-border"
            >
              <option value="pt-BR">Português</option>
              <option value="en">English (em breve)</option>
              <option value="es">Español (em breve)</option>
            </select>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
