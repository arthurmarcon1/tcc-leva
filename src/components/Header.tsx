import { motion } from "framer-motion";
import { Bell, MapPin } from "lucide-react";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
}

export function Header({ title = "Leva", showLocation = true }: HeaderProps) {
  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 safe-area-top">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {title}
          </motion.h1>
          {showLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5"
            >
              <MapPin size={14} />
              <span>Região Sul</span>
            </motion.div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="relative w-11 h-11 rounded-full bg-secondary flex items-center justify-center"
        >
          <Bell size={20} className="text-foreground" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />
        </motion.button>
      </div>
    </header>
  );
}
