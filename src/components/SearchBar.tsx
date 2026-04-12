import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { CityAutocomplete } from "./CityAutocomplete";

interface SearchBarProps {
  onSearch?: (origin: string, destination: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const handleSearch = () => {
    if (onSearch) {
      onSearch(origin, destination);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 shadow-elevated border border-border"
    >
      <div className="space-y-3">
        {/* Origin */}
        <CityAutocomplete
          value={origin}
          onChange={setOrigin}
          placeholder="De onde sai?"
          icon="origin"
        />

        {/* Divider with Arrow */}
        <div className="flex items-center justify-center">
          <div className="flex-1 h-px bg-border" />
          <div className="mx-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <ArrowRight size={16} className="text-muted-foreground rotate-90" />
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Destination */}
        <CityAutocomplete
          value={destination}
          onChange={setDestination}
          placeholder="Para onde vai?"
          icon="destination"
        />
      </div>

      <Button onClick={handleSearch} className="w-full mt-4" size="lg">
        <Search size={18} />
        Buscar viagens
      </Button>
    </motion.div>
  );
}
