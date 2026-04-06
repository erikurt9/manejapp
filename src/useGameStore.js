import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "./supabase";

// ─── DIVISIONES ──────────────────────────────────────────────────────────────
export const DIVISIONES = [
  { id: "bronce", label: "Bronce", emoji: "🥉", minXP: 0,    maxXP: 500,  color: "#cd7f32" },
  { id: "plata",  label: "Plata",  emoji: "🥈", minXP: 500,  maxXP: 1500, color: "#94a3b8" },
  { id: "oro",    label: "Oro",    emoji: "🥇", minXP: 1500, maxXP: 9999, color: "#f59e0b" },
];

export function getDivision(xp) {
  return DIVISIONES.findLast(d => xp >= d.minXP) ?? DIVISIONES[0];
}

export function getXPProgress(xp) {
  const div = getDivision(xp);
  const next = DIVISIONES[DIVISIONES.indexOf(div) + 1];
  if (!next) return { division: div, pct: 100, xpInLevel: xp - div.minXP, xpNeeded: 0 };
  const xpInLevel = xp - div.minXP;
  const xpNeeded = next.minXP - div.minXP;
  return { division: div, next, pct: Math.round((xpInLevel / xpNeeded) * 100), xpInLevel, xpNeeded };
}

// ─── STORE ───────────────────────────────────────────────────────────────────
export const useGameStore = create(
  persist(
    (set, get) => ({
      isPremium: false,          // toggle manual para pruebas en localhost
      lives: 5,
      lastLifeLoss: null,
      streak: 0,
      xp: 0,

      // Inteligente: controla 1 sesión gratuita por día
      lastInteligenteDate: null, // "YYYY-MM-DD"
      intelligenteUsedToday: false,

      // ── Setters directos (útiles para pruebas / sync con Supabase) ──────────
      setIsPremium: (v) => set({ isPremium: v }),
      setLives: (v) => set({ lives: Math.max(0, Math.min(5, v)) }),
      setStreak: (v) => set({ streak: v }),
      setXP: (v) => set({ xp: v }),

      // ── Toggle para localhost ────────────────────────────────────────────────
      togglePremium: () => set((s) => ({ isPremium: !s.isPremium })),

      // ── Perder 1 vida (en modo estudio) ─────────────────────────────────────
      loseLife: () => {
        const { lives, isPremium } = get();
        if (isPremium) return { dead: false };
        const next = Math.max(0, lives - 1);
        set({ lives: next, lastLifeLoss: new Date().toISOString() });
        return { dead: next === 0 };
      },

      // ── Restaurar vidas a medianoche ─────────────────────────────────────────
      checkLifeRegen: () => {
        const { lastLifeLoss, lives } = get();
        if (!lastLifeLoss || lives >= 5) return;
        const lost = new Date(lastLifeLoss);
        const now = new Date();
        // Regenerar 1 vida cada 4 horas
        const horasTranscurridas = (now - lost) / (1000 * 60 * 60);
        const vidasRegeneradas = Math.floor(horasTranscurridas / 4);
        if (vidasRegeneradas > 0) {
          const nuevas = Math.min(5, lives + vidasRegeneradas);
          set({ lives: nuevas });
        }
      },

      // ── Ganar XP ────────────────────────────────────────────────────────────
      gainXP: (points) => set((s) => ({ xp: s.xp + points })),

      // ── Registrar sesión inteligente ─────────────────────────────────────────
      useInteligenteSession: () => {
        const today = new Date().toISOString().split("T")[0];
        set({ lastInteligenteDate: today, intelligenteUsedToday: true });
      },

      canUseInteligente: () => {
        const { isPremium, lastInteligenteDate } = get();
        if (isPremium) return true;
        const today = new Date().toISOString().split("T")[0];
        return lastInteligenteDate !== today;
      },

      checkInteligenteReset: () => {
        const { lastInteligenteDate } = get();
        const today = new Date().toISOString().split("T")[0];
        if (lastInteligenteDate !== today) {
          set({ intelligenteUsedToday: false });
        }
      },

      // ── Sync con Supabase profile ────────────────────────────────────────────
      syncFromProfile: async (userId) => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("is_premium, lives, last_life_loss, streak, xp_points")
            .eq("id", userId)
            .single();
          if (data) {
            set({
              isPremium: data.is_premium ?? false,
              lives: data.lives ?? 5,
              lastLifeLoss: data.last_life_loss ?? null,
              streak: data.streak ?? 0,
              xp: data.xp_points ?? 0,
            });
          }
        } catch (e) {
          console.warn("No se pudo sincronizar profile:", e.message);
        }
      },

      syncToProfile: async (userId) => {
        const { isPremium, lives, lastLifeLoss, streak, xp } = get();
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            is_premium: isPremium,
            lives,
            last_life_loss: lastLifeLoss,
            streak,
            xp_points: xp,
          });
        } catch (e) {
          console.warn("No se pudo guardar profile:", e.message);
        }
      },
    }),
    {
      name: "maneja-game-store",
      partialize: (s) => ({
        isPremium: s.isPremium,
        lives: s.lives,
        lastLifeLoss: s.lastLifeLoss,
        streak: s.streak,
        xp: s.xp,
        lastInteligenteDate: s.lastInteligenteDate,
        intelligenteUsedToday: s.intelligenteUsedToday,
      }),
    }
  )
);
