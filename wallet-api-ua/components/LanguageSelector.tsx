"use client";

import { useState, useEffect, useRef } from "react";

const LANGUAGES = [
  { code: "EN", name: "English", flag: "🇺🇸" },
  { code: "ES", name: "Español", flag: "🇪🇸" },
  { code: "FR", name: "Français", flag: "🇫🇷" },
  { code: "ZH", name: "中文", flag: "🇨🇳" },
  { code: "DE", name: "Deutsch", flag: "🇩🇪" },
];

interface LanguageSelectorProps {
  inverted?: boolean;
}

export function LanguageSelector({ inverted = false }: LanguageSelectorProps) {
  const [currentLang, setCurrentLang] = useState<string>("EN");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pact_lang");
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setCurrentLang(saved);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setCurrentLang(code);
    localStorage.setItem("pact_lang", code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer border ${
          inverted
            ? "border-white/10 text-white/90 hover:bg-white/10 hover:text-white"
            : "border-forest/15 text-forest/80 hover:bg-forest/5 hover:text-forest"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="font-bold tracking-widest uppercase">{currentLang}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-40 rounded-lg shadow-2xl py-1.5 z-50 border backdrop-blur-md ${
            inverted
              ? "bg-[#0D1F16] border-white/10 text-white"
              : "bg-white border-forest/10 text-forest"
          }`}
          style={{ animation: "fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest opacity-40 border-b border-white/10 mb-1">
            Select Language
          </div>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                currentLang === l.code
                  ? inverted
                    ? "text-[#9EFFBF] bg-white/10 font-bold"
                    : "text-forest bg-forest/5 font-bold"
                  : inverted
                  ? "text-white/70 hover:text-white hover:bg-white/5"
                  : "text-forest/70 hover:text-forest hover:bg-forest/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span>{l.name}</span>
              </span>
              <span className="text-[10px] opacity-50 font-bold">{l.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
