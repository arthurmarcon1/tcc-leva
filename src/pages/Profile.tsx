import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Star,
  Package,
  Car,
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ProfileReviews } from "@/components/ProfileReviews";
import { ProfileTrips } from "@/components/ProfileTrips";

const menuItems = [
  { icon: Bell, label: "Notificações", path: "/profile/notifications" },
  { icon: Settings, label: "Configurações", path: "/profile/settings" },
  { icon: HelpCircle, label: "Ajuda e suporte", path: "/profile/help" },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null }>({ full_name: null, avatar_url: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [realStats, setRealStats] = useState({ shipments: 0, trips: 0, rating: "—" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile(data);
    });
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false).then(({ count }) => {
      setUnreadCount(count || 0);
    });
    // Real stats
    supabase.from("shipment_requests").select("id", { count: "exact", head: true }).eq("requester_id", user.id).then(({ count }) => {
      setRealStats((prev) => ({ ...prev, shipments: count || 0 }));
    });
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => {
      setRealStats((prev) => ({ ...prev, trips: count || 0 }));
    });
    supabase.from("reviews").select("rating").eq("reviewed_id", user.id).then(({ data }) => {
      if (data && data.length > 0) {
        const avg = (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1);
        setRealStats((prev) => ({ ...prev, rating: avg }));
      }
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Perfil" showLocation={false} />

      <main className="px-4 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 shadow-card border border-border text-center"
        >
          <div className="relative mx-auto mb-4 w-24 h-24">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-secondary text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-soft">
              <Star size={14} className="text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
          <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
          <p className="text-xs text-muted-foreground mb-4">
            Membro desde {new Date(user?.created_at || "").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/profile/edit")}>
            Editar perfil
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { icon: Package, label: "Envios", value: String(realStats.shipments) },
            { icon: Car, label: "Viagens", value: String(realStats.trips) },
            { icon: Star, label: "Avaliação", value: realStats.rating },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-4 text-center shadow-card border border-border"
            >
              <stat.icon size={20} className="text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Reviews */}
        {user && <ProfileReviews userId={user.id} />}



        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl shadow-card border border-border overflow-hidden"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors ${
                index !== menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <item.icon size={18} className="text-foreground" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">
                {item.label}
              </span>
              {item.label === "Notificações" && unreadCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sair da conta
          </Button>
        </motion.div>

        {/* About */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Leva v1.0.0 • Feito com 💚 pela comunidade
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
