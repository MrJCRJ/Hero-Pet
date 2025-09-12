"use client";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useState } from "react";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const [exploding, setExploding] = useState(false);

  const handleToggle = () => {
    setExploding(true);
    toggleTheme();
    setTimeout(() => setExploding(false), 600); // duração do efeito
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Explosão sincronizada */}
      <AnimatePresence>
        {exploding && (
          <motion.div
            className="fixed top-1/2 left-1/2 rounded-full pointer-events-none z-20"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 50, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ backgroundColor: isDark ? "#38bdf8" : "#2563eb" }}
          />
        )}
      </AnimatePresence>

      {/* Botão toggle */}
      <motion.button
        onClick={handleToggle}
        aria-label="Alternar tema"
        aria-pressed={isDark}
        whileTap={{ scale: 0.9 }}
        className="relative flex h-7 w-7 items-center justify-center rounded-full 
                   bg-[var(--color-bg-secondary)] shadow-md z-30
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 180, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-indigo-500" />
            ) : (
              <Sun className="h-4 w-4 text-yellow-500" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
