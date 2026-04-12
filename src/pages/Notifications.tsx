import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Check, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifications(data || []);
        setLoading(false);
      });
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Notificações</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm font-medium text-primary">
              Marcar todas como lidas
            </button>
          )}
        </div>
      </header>

      <main className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma notificação</h3>
            <p className="text-sm text-muted-foreground">Você será notificado sobre suas viagens e envios aqui</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-card rounded-xl p-4 shadow-card border border-border flex gap-3 ${!notification.read ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground text-sm">{notification.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(notification.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {!notification.read && (
                    <button onClick={() => markAsRead(notification.id)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Check size={14} className="text-primary" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(notification.id)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
