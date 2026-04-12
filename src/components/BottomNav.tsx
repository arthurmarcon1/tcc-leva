import { motion } from "framer-motion";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Buscar", path: "/search" },
  { icon: PlusCircle, label: "Publicar", path: "/publish", isMain: true },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 rounded-full gradient-primary shadow-soft flex items-center justify-center">
                  <Icon size={24} className="text-primary-foreground" />
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors"
            >
              <Icon
                size={22}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
