import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { brazilianCities } from "@/data/cities";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: "origin" | "destination";
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder,
  icon = "origin",
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 1) {
      const filtered = brazilianCities.filter((city) =>
        city.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 6));
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
        {icon === "origin" ? (
          <div className="w-3 h-3 rounded-full bg-primary" />
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
        )}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 1 && suggestions.length > 0 && setIsOpen(true)}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-elevated border border-border z-50 overflow-hidden"
          >
            {suggestions.map((city, index) => (
              <button
                key={city}
                onClick={() => handleSelect(city)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${
                  index !== suggestions.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <MapPin size={16} className="text-primary shrink-0" />
                <span className="text-foreground text-sm">{city}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
