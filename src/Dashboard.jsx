import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { obtenerDashboard, obtenerDetalleExamen, eliminarExamen, limpiarStats } from "./db";
import { calcularProbabilidadAprobar, obtenerResumenAdaptativo } from "./adaptativo";
import { supabase } from "./supabase";
import { PREGUNTAS } from "./preguntas";
import { PREGUNTAS_MOTO } from "./preguntas_moto";
import { useGameStore } from "./useGameStore";
import { XPBar, LivesDisplay, StreakDisplay, InteligenteLockedModal } from "./FreemiumUI";

const TODAS_PREGUNTAS = [...PREGUNTAS, ...PREGUNTAS_MOTO];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

// ── SwipeToDelete ──────────────────────────────────────────────────────────────
function SwipeToDelete({ onDelete, children, disabled = false }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startXRef = useRef(null);
  const currentXRef = useRef(0);
  const THRESHOLD = 80;

  const handleTouchStart = (e) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (startXRef.current === null || disabled) return;
    const delta = e.touches[0].clientX - startXRef.current;
    if (delta > 0) return;
    currentXRef.current = delta;
    setOffsetX(Math.max(delta, -160));
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsDragging(false);
    if (currentXRef.current <= -THRESHOLD) {
      setDismissed(true);
      setTimeout(() => onDelete(), 300);
    } else {
      setOffsetX(0);
      currentXRef.current = 0;
    }
    startXRef.current = null;
  };

  const revealWidth = Math.min(Math.abs(offsetX), 160);
  const deleteOpacity = Math.min(revealWidth / THRESHOLD, 1);
  const deleteScale = 0.8 + 0.2 * Math.min(revealWidth / THRESHOLD, 1);

  return (
    <motion.div
      className="relative overflow-hidden"
      animate={dismissed ? { x: "110%", opacity: 0, height: 0 } : {}}
      transition={dismissed ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] } : {}}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500/90"
        style={{ width: revealWidth, opacity: deleteOpacity }}
      >
        <motion.span style={{ scale: deleteScale }} className="text-white text-lg">🗑️</motion.span>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

const IconHome = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className={className}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconHistory = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconChart = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className={className}>
    <path d="M3 20h18M7 20V10M12 20V4M17 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPlay = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
  </svg>
);
const IconMenu = ({ size = 20 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconX = ({ size = 18 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const IconArrow = ({ size = 14 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconTrash = ({ size = 15 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconLogout = ({ size = 15 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Iconos para los steps de progresión
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2" y="4.5" width="6" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const Skeleton = ({ h = "h-16" }) => (
  <div className={`${h} rounded-2xl animate-pulse`} style={{ background: "rgba(255,255,255,0.04)" }} />
);

// ── Detalle examen ─────────────────────────────────────────────────────────────
function DetalleExamen({ examen, respuestas, onVolver }) {
  const ok = examen.puntaje_obtenido >= 33;
  const pct = Math.round((examen.correctas / examen.total) * 100);
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }} className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-slate-800 flex-shrink-0"
        style={{ background: "rgba(10,15,26,0.95)", backdropFilter: "blur(12px)" }}>
        <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} onClick={onVolver}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold bg-transparent border-0 outline-none p-0">
          ← Volver
        </motion.button>
        <div className="w-px h-4 bg-slate-800" />
        <span className={`text-sm font-black ${ok ? "text-emerald-400" : "text-red-400"}`}>
          {ok ? "🎉 Aprobado" : "📚 Reprobado"}
        </span>
        <span className="text-slate-600 text-xs hidden sm:block ml-1">
          {examen.puntaje_obtenido}/{examen.puntaje_maximo} pts · {new Date(examen.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
        </span>
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <div className="text-base font-black text-emerald-400">{examen.correctas}</div>
              <div className="text-xs text-slate-600">correctas</div>
            </div>
            <div className="text-center">
              <div className="text-base font-black text-red-400">{examen.incorrectas}</div>
              <div className="text-xs text-slate-600">incorrectas</div>
            </div>
          </div>
          <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-xs flex-shrink-0 ${ok ? "border-emerald-500 text-emerald-400" : "border-red-500 text-red-400"}`}>
            {pct}%
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {respuestas.map((r, i) => {
            const pregunta = TODAS_PREGUNTAS.find(p => p.id === r.pregunta_id);
            if (!pregunta) return null;
            return (
              <motion.div key={r.pregunta_id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
                className={`rounded-2xl border overflow-hidden ${r.es_correcta ? "border-emerald-500/25" : "border-red-500/25"}`}
                style={{ background: r.es_correcta ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)" }}>
                <div className="px-4 md:px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.es_correcta ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {r.es_correcta ? "✓ Correcta" : "✗ Incorrecta"}
                    </span>
                    <span className="text-xs text-slate-500">{pregunta.icono} {pregunta.categoria}</span>
                    <span className="ml-auto text-xs text-slate-600">#{i + 1}</span>
                  </div>
                  <p className="text-white font-semibold text-sm md:text-base leading-snug">{pregunta.pregunta}</p>
                  {pregunta.imagen && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/40 flex items-center justify-center">
                      <img src={pregunta.imagen} alt="" className="max-h-36 object-contain p-3" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 px-4 md:px-5 pb-3">
                  {pregunta.opciones.map((op, j) => {
                    const esCorrecta = j === pregunta.correcta;
                    const esRespondida = j === r.respondida;
                    const esIncorrecta = esRespondida && !esCorrecta;
                    return (
                      <div key={j} className={`flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-xl border text-sm ${esCorrecta ? "border-emerald-500/50 text-emerald-300" : esIncorrecta ? "border-red-500/40 text-red-300" : "border-slate-700/30 text-slate-600"}`}
                        style={{ background: esCorrecta ? "rgba(16,185,129,0.06)" : esIncorrecta ? "rgba(239,68,68,0.06)" : "transparent" }}>
                        <span className={`w-6 h-6 rounded-lg border-2 border-current flex items-center justify-center flex-shrink-0 text-xs font-black ${esCorrecta ? "bg-emerald-500/20" : esIncorrecta ? "bg-red-500/20" : ""}`}>
                          {esCorrecta ? "✓" : esIncorrecta ? "✗" : String.fromCharCode(65 + j)}
                        </span>
                        <span className="flex-1">{op}</span>
                        {esRespondida && !esCorrecta && <span className="text-xs text-red-400/80 flex-shrink-0 font-medium">tu resp.</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mx-4 md:mx-5 mb-4 md:mb-5 px-4 py-3 rounded-xl border border-slate-700/30" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">💡 Explicación</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{pregunta.explicacion}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}


// ── Logo ManejaCL (marca de agua sutil) ────────────────────────────────────────
function ManejaCLLogo({ corner = "tr" }) {
  const posStyle = {
    tr: { top: 10, right: 10 },
    tl: { top: 10, left: 10 },
    br: { bottom: 10, right: 10 },
    bl: { bottom: 10, left: 10 },
  }[corner] || { top: 10, right: 10 };

  return (
    <div className="absolute pointer-events-none z-10 flex items-center gap-1 opacity-25"
      style={posStyle}>
      <div className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)", boxShadow: "0 0 6px rgba(37,99,235,0.5)" }}>
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="7" r="3.5" stroke="white" strokeWidth="1.4"/>
          <path d="M4 4l2-2.5L8 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-white font-black text-[9px] tracking-tight leading-none">ManejaCL</span>
    </div>
  );
}


// ---------- obtenerTresHitos (inline, sensible a clase) ----------------------
async function obtenerTresHitos(userId, clase) {
  const banco      = clase === "C" ? PREGUNTAS_MOTO : PREGUNTAS;
  const totalBanco = banco.length; // 57 para Clase C, 215 para Clase B

  const { data: statsClase } = await supabase
    .from("pregunta_stats")
    .select("pregunta_id, veces_vista, veces_correcta, intervalo_dias")
    .eq("user_id", userId)
    .eq("clase", clase);

  const stats       = statsClase || [];
  const totalVistas = stats.length;

  // Hito 1: porcentaje del banco de la clase respondido al menos 1 vez
  const pctDominio = totalBanco > 0
    ? Math.min(100, Math.round((totalVistas / totalBanco) * 100))
    : 0;

  // Hito 2: limpieza SM-2 (intervalo_dias >= 3 = consolidada)
  const limpias = stats.filter(s => s.intervalo_dias >= 3).length;
  const sucias  = stats.filter(s => s.intervalo_dias === 0).length;
  const enCurso = stats.filter(s => s.intervalo_dias === 1).length;
  let pctRefuerzo = 0;
  if (totalVistas > 0) {
    const score = limpias - sucias * 0.5;
    pctRefuerzo = Math.min(100, Math.max(0, Math.round((score / totalVistas) * 100)));
  }

  // Hito 3: probabilidad basada en simulacros reales
  const { data: examenes } = await supabase
    .from("examenes")
    .select("puntaje_obtenido, created_at")
    .eq("user_id", userId)
    .eq("modo", "examen")
    .eq("clase", clase)
    .order("created_at", { ascending: false })
    .limit(10);

  let pctExamen = 0, totalSimulacros = 0;
  if (examenes && examenes.length > 0) {
    totalSimulacros = examenes.length;
    let rachaAprobados = 0;
    for (const ex of examenes) {
      if (ex.puntaje_obtenido >= 33) rachaAprobados++;
      else break;
    }
    if (rachaAprobados >= 3) {
      pctExamen = 100;
    } else {
      const n = examenes.length;
      const factorConfianza = Math.min(1, 0.3 + n * 0.14);
      let sumaPesos = 0, sumaPonderada = 0;
      examenes.forEach((ex, i) => {
        const peso = 1 / Math.pow(i + 1, 0.6);
        const rendimiento = Math.min(ex.puntaje_obtenido / 33, 1);
        sumaPonderada += rendimiento * peso;
        sumaPesos += peso;
      });
      const tasaReal = sumaPonderada / sumaPesos;
      const bonusRacha = n >= 2 ? rachaAprobados * 6 : 0;
      const probRaw = tasaReal * 80 + bonusRacha;
      pctExamen = Math.min(Math.max(Math.round(50 + (probRaw - 50) * factorConfianza), 5), 99);
    }
  }

  return {
    hito1: { pct: pctDominio,  vistas: totalVistas, total: totalBanco, activo: totalVistas > 0 },
    hito2: { pct: pctRefuerzo, limpias, sucias, enCurso,               activo: totalVistas > 0 },
    hito3: { pct: pctExamen,   simulacros: totalSimulacros,             activo: totalSimulacros > 0 },
    clase,
    totalBanco,
  };
}

// ---------- TresHitos component ----------------------------------------------
function TresHitos({ hitos, loading, clase, onIniciar }) {
  const totalBanco = hitos?.totalBanco ?? (clase === "C" ? 57 : 215);

  const items = [
    {
      id:       "dominio",
      emoji:    "P",
      label:    "Dominio del\nManual",
      pct:      hitos?.hito1?.pct ?? 0,
      activo:   hitos?.hito1?.activo ?? false,
      sublabel: hitos?.hito1?.activo
        ? (hitos.hito1.vistas + " / " + totalBanco + " vistas")
        : ("0 / " + totalBanco + " preguntas"),
      hint:   "Inicia el Modo Estudio",
      color:  "#f59e0b",
      glow:   "rgba(245,158,11,0.55)",
      trackBg:"rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.28)",
      accion: () => onIniciar("estudio", clase),
    },
    {
      id:       "refuerzo",
      emoji:    "C",
      label:    "Refuerzo\nInteligente",
      pct:      hitos?.hito2?.pct ?? 0,
      activo:   hitos?.hito2?.activo ?? false,
      sublabel: hitos?.hito2?.activo
        ? (hitos.hito2.limpias + " limpias / " + hitos.hito2.sucias + " por repasar")
        : "Sin errores registrados",
      hint:   "Practica Modo Inteligente",
      color:  "#a855f7",
      glow:   "rgba(168,85,247,0.55)",
      trackBg:"rgba(168,85,247,0.10)",
      border: "rgba(168,85,247,0.28)",
      accion: () => onIniciar("inteligente", clase),
    },
    {
      id:       "examen",
      emoji:    "E",
      label:    "Probabilidad\nde Examen",
      pct:      hitos?.hito3?.pct ?? 0,
      activo:   hitos?.hito3?.activo ?? false,
      sublabel: hitos?.hito3?.activo
        ? (hitos.hito3.simulacros + " simulacro" + (hitos.hito3.simulacros > 1 ? "s" : ""))
        : "Sin simulacros",
      hint:   "Haz un simulacro real",
      color:  "#10b981",
      glow:   "rgba(16,185,129,0.55)",
      trackBg:"rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.28)",
      accion: () => onIniciar("examen", clase),
    },
  ];

  const emojiMap = { "P": "P", "C": "C", "E": "E" };
  const labelMap = { "P": "\uD83D\uDCD6", "C": "\uD83E\uDDE0", "E": "\uD83C\uDFAF" };

  const R    = 31;
  const CIRC = 2 * Math.PI * R;

  const hitosActivos = [hitos?.hito1, hitos?.hito2, hitos?.hito3].filter(h => h?.activo);
  const pctTotal = hitosActivos.length > 0
    ? Math.round(hitosActivos.reduce((s, h) => s + h.pct, 0) / 3)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="h-4 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[0,1,2].map(i => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  const emojis = ["\uD83D\uDCD6", "\uD83E\uDDE0", "\uD83C\uDFAF"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2.5 px-0.5">
        <span className="text-sm font-black uppercase tracking-widest text-white">Hitos de Preparacion</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider flex-shrink-0">
          {clase === "C" ? "Clase C Moto" : "Clase B Auto"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {items.map((item, idx) => {
          const dashoffset = CIRC * (1 - item.pct / 100);
          const bloqueado  = !item.activo;
          const emoji      = emojis[idx];

          return (
            <motion.button
              key={item.id}
              onClick={item.accion}
              whileTap={{ scale: 0.96 }}
              whileHover={{ filter: "brightness(1.09)" }}
              className="relative flex flex-col items-center gap-2 rounded-2xl px-2 pt-4 pb-3 text-center outline-none border-0"
              style={{
                background: "linear-gradient(160deg, rgba(15,20,32,0.97) 0%, rgba(9,13,22,0.99) 100%)",
                border: "1px solid " + (bloqueado ? "rgba(71,85,105,0.18)" : item.border),
                boxShadow: bloqueado ? "none" : "0 2px 18px " + item.glow.replace("0.55", "0.09"),
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.09, duration: 0.35 }}
            >
              {!bloqueado && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 85% 55% at 50% 110%, " + item.trackBg + ", transparent 70%)" }} />
              )}
              {!bloqueado && (
                <div className="absolute top-0 left-4 right-4 h-px rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, " + item.color + "55, transparent)" }} />
              )}

              <div className="relative flex-shrink-0">
                <svg width="74" height="74" viewBox="0 0 74 74">
                  <circle cx="37" cy="37" r={R} fill="none"
                    stroke={bloqueado ? "rgba(71,85,105,0.14)" : item.trackBg}
                    strokeWidth="6.5" />
                  <motion.circle
                    cx="37" cy="37" r={R} fill="none"
                    stroke={bloqueado ? "#1e293b" : item.color}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    initial={{ strokeDashoffset: CIRC }}
                    animate={{ strokeDashoffset: bloqueado ? CIRC : dashoffset }}
                    transition={{ duration: 1.25, delay: 0.35 + idx * 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{
                      transformOrigin: "37px 37px",
                      transform: "rotate(-90deg)",
                      filter: bloqueado ? "none" : "drop-shadow(0 0 7px " + item.glow + ")",
                    }}
                  />
                  {bloqueado ? (
                    <>
                      <text x="37" y="34" textAnchor="middle" dominantBaseline="middle"
                        fill="#334155" fontSize="20" fontFamily="inherit">{emoji}</text>
                      <text x="37" y="49" textAnchor="middle" dominantBaseline="middle"
                        fill="#1e293b" fontSize="7.5" fontWeight="700" fontFamily="inherit">
                        pendiente
                      </text>
                    </>
                  ) : (
                    <>
                      <text x="37" y="33" textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="15" fontWeight="900" fontFamily="inherit">
                        {item.pct + "%"}
                      </text>
                      <text x="37" y="47" textAnchor="middle" dominantBaseline="middle"
                        fill={item.color} fontSize="7" fontWeight="700" fontFamily="inherit">
                        {item.pct >= 85 ? "excelente" : item.pct >= 55 ? "avanzando" : item.pct >= 20 ? "iniciando" : "comenzando"}
                      </text>
                    </>
                  )}
                </svg>
                {!bloqueado && item.pct >= 80 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 14, delay: 1.3 + idx * 0.1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: item.color, boxShadow: "0 0 10px " + item.glow }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7.5L8 3" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col gap-0.5 w-full px-0.5">
                <p className="font-bold leading-tight text-white" style={{ fontSize: "9.5px" }}>
                  {item.label.split("\n").map((l, i, arr) => (
                    <React.Fragment key={i}>{l}{i < arr.length - 1 && <br />}</React.Fragment>
                  ))}
                </p>
                <p className="leading-tight" style={{
                  fontSize: "8px",
                  color: bloqueado ? "#1e3a5f" : "rgba(148,163,184,0.65)",
                  lineHeight: 1.35,
                }}>
                  {bloqueado ? item.hint : item.sublabel}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

    </motion.div>
  );
}

// ── Barra de progreso global ───────────────────────────────────────────────────
function GlobalProgressBar({ globalPct = 0, sinDatos = false }) {
  const pct = sinDatos ? 0 : globalPct;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative rounded-2xl overflow-hidden px-5 py-3.5"
      style={{
        background: sinDatos
          ? "linear-gradient(145deg, rgba(15,20,30,0.97) 0%, rgba(10,14,22,0.99) 100%)"
          : "linear-gradient(145deg, rgba(10,20,50,0.97) 0%, rgba(6,14,35,0.99) 100%)",
        border: sinDatos ? "1px solid rgba(100,116,139,0.18)" : "1px solid rgba(37,99,235,0.25)",
        boxShadow: sinDatos ? "none" : "0 2px 20px rgba(37,99,235,0.12)",
      }}
    >
      {/* Glow sutil fondo */}
      {!sinDatos && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(37,99,235,0.08), transparent 70%)" }} />
      )}

      <div className="relative flex items-center gap-3">
        {/* Label izquierda */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 leading-none">
            Nivel de preparación global
          </span>
          <motion.span
            key={pct}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xl font-black leading-none"
            style={sinDatos ? { color: "#475569", letterSpacing: "-0.5px" } : {
              background: "linear-gradient(90deg, #60a5fa, #22d3ee, #4ade80)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.5px",
            }}
          >
            {sinDatos ? "—" : `${pct}%`}
          </motion.span>
        </div>

        {/* Barra degradado */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="relative h-2.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: sinDatos ? "0%" : `${pct}%` }}
              transition={{ duration: 1.3, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={sinDatos ? {} : {
                background: "linear-gradient(90deg, #2563eb 0%, #06b6d4 50%, #22c55e 100%)",
                boxShadow: "0 0 12px rgba(34,211,238,0.5)",
              }}
            />
            {/* Brillo interior */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)" }} />
          </div>

          {/* Milestones */}
          <div className="flex items-center justify-between">
            {[0, 25, 50, 75, 100].map(m => (
              <div key={m} className="flex flex-col items-center gap-0.5">
                <div className="w-px h-1"
                  style={{ background: (!sinDatos && m <= pct) ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.1)" }} />
                <span className="text-[9px] font-semibold tabular-nums"
                  style={{ color: (!sinDatos && m <= pct) ? "rgba(34,211,238,0.6)" : "rgba(100,116,139,0.5)" }}>
                  {m === 0 ? "" : `${m}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje sin datos */}
        {sinDatos && (
          <span className="text-[10px] text-slate-600 font-medium flex-shrink-0 text-right leading-tight" style={{ maxWidth: 80 }}>
            Haz un examen para calcularlo
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── HeroProgreso ───────────────────────────────────────────────────────────────
function HeroProgreso({ probabilidad, adaptativo, datos, onIniciar, loading, clase, tresHitos }) {
  const esNuevo = !datos || datos.examenes.length === 0;
  const pct = probabilidad ?? 0;
  const nivel = esNuevo ? "sinDatos" : pct < 50 ? "bajo" : pct < 80 ? "medio" : "alto";

  const config = {
    sinDatos: {
      modo: "estudio",
      titulo: "¡Bienvenido!\nEmpecemos.",
      desc1: "Aún no tienes datos de estudio.",
      desc2: null,
      label: null,
      ringColor: "#475569",
      ringGlow: "rgba(71,85,105,0.4)",
      ctaBg: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
      ctaShadow: "0 6px 24px rgba(30,41,59,0.45)",
      cardBg: "linear-gradient(145deg, rgba(15,20,30,0.99) 0%, rgba(10,15,22,0.99) 100%)",
      borderColor: "rgba(71,85,105,0.25)",
      glowColor: "rgba(71,85,105,0.06)",
      accentLine: "linear-gradient(90deg, rgba(71,85,105,0.5), rgba(71,85,105,0.1), transparent)",
      isCritical: false,
      btnLabel: "Hacer un examen de prueba",
    },
    bajo: {
      modo: "estudio",
      titulo: "⚡ RECOMENDADO PARA TI",
      desc1: "Tema crítico detectado — trabájalo hoy.",
      desc2: adaptativo?.topDebiles?.[0] ? `Fallaste preguntas de ${adaptativo.topDebiles[0].categoria} recientemente.` : null,
      label: "CRÍTICO",
      ringColor: "#ef4444",
      ringGlow: "rgba(239,68,68,0.65)",
      ctaBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      ctaShadow: "0 6px 24px rgba(220,38,38,0.45)",
      cardBg: "linear-gradient(145deg, rgba(30,6,6,0.99) 0%, rgba(20,4,4,0.99) 100%)",
      borderColor: "rgba(220,38,38,0.45)",
      glowColor: "rgba(220,38,38,0.18)",
      accentLine: "linear-gradient(90deg, rgba(239,68,68,0.8), rgba(239,68,68,0.2), transparent)",
      isCritical: true,
      btnLabel: "Estudiar ahora",
    },
    medio: {
      modo: "inteligente",
      titulo: adaptativo?.topDebiles?.[0]
        ? `Vas bien. Corrige\n${adaptativo.topDebiles[0].categoria.toLowerCase()}`
        : "Vas bien. Sigue\npracticando.",
      desc1: adaptativo?.topDebiles?.[0]
        ? "Buen ritmo — hay un punto débil claro que trabajar."
        : "Buen ritmo, sigue mejorando.",
      desc2: adaptativo?.topDebiles?.[0]
        ? `Has fallado preguntas de ${adaptativo.topDebiles[0].categoria} recientemente.`
        : null,
      label: "Progreso medio",
      ringColor: "#a855f7",
      ringGlow: "rgba(168,85,247,0.65)",
      ctaBg: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
      ctaShadow: "0 6px 24px rgba(168,85,247,0.40)",
      cardBg: "linear-gradient(145deg, rgba(18,8,30,0.98) 0%, rgba(12,4,22,0.98) 100%)",
      borderColor: "rgba(168,85,247,0.30)",
      glowColor: "rgba(168,85,247,0.12)",
      accentLine: "linear-gradient(90deg, rgba(168,85,247,0.6), rgba(168,85,247,0.1), transparent)",
      isCritical: false,
      btnLabel: "🧠 Practicar inteligente",
    },
    alto: {
      modo: "examen",
      titulo: "¡Estás listo\npara rendir!",
      desc1: "Excelente preparación.",
      desc2: "Simula el examen real para confirmar tu nivel.",
      label: "Listo para el examen",
      ringColor: "#10b981",
      ringGlow: "rgba(16,185,129,0.65)",
      ctaBg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      ctaShadow: "0 6px 24px rgba(16,185,129,0.35)",
      cardBg: "linear-gradient(145deg, rgba(4,20,14,0.98) 0%, rgba(2,14,10,0.98) 100%)",
      borderColor: "rgba(16,185,129,0.25)",
      glowColor: "rgba(16,185,129,0.09)",
      accentLine: "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.1), transparent)",
      isCritical: false,
      btnLabel: "Simular examen",
    },
  }[nivel];

  // Círculo de progreso — muestra el hito del modo recomendado
  const R = 48;
  const CIRC = 2 * Math.PI * R;

  // Cada nivel mapea al hito correspondiente
  const hitoMap = {
    sinDatos: { data: null,               sublabel: "sin datos",       ringColorOverride: null },
    bajo:     { data: tresHitos?.hito1,   sublabel: "dominio manual",  ringColorOverride: "#f59e0b" },
    medio:    { data: tresHitos?.hito2,   sublabel: "refuerzo",        ringColorOverride: "#a855f7" },
    alto:     { data: tresHitos?.hito3,   sublabel: "prob. examen",    ringColorOverride: "#10b981" },
  };
  const hitoActual = hitoMap[nivel];
  const topicPct = esNuevo ? 0 : (hitoActual.data?.activo ? hitoActual.data.pct : 0);
  const ringColor = hitoActual.ringColorOverride ?? config.ringColor;
  const ringGlow  = esNuevo ? config.ringGlow : ringColor + "aa";
  const dashoffset = CIRC * (1 - topicPct / 100);

  // Plan inteligente — solo si hay datos reales de debilidades
  const cantDebiles = adaptativo?.debiles ?? 0;
  const catDebil = adaptativo?.topDebiles?.[0]?.categoria ?? null;
  const pregsCat = cantDebiles > 0 ? Math.min(cantDebiles, 10) : 5;
  const pregsMix = cantDebiles >= 10 ? 5 : Math.max(0, 10 - pregsCat);
  const tiempoEst = Math.round((pregsCat + pregsMix) * 0.4);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-10 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-56 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-36 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
      </div>
    );
  }

  return (
    <motion.div {...fadeUp(0.1)} className="flex flex-col gap-4">

      {/* ── Título sección 1 ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-0.5">
        <span className="text-sm font-black uppercase tracking-widest text-white">🎯 Tu Plan Personalizado</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* ── Hero card principal ───────────────────────────────────────────── */}
      <motion.div
        className="relative rounded-2xl border overflow-hidden"
        style={{ borderColor: config.borderColor, background: config.cardBg }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Badge CRÍTICO flotante */}
        {config.isCritical && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(220,38,38,0.95)",
              border: "1px solid rgba(255,100,100,0.4)",
              boxShadow: "0 0 16px rgba(220,38,38,0.6)",
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0"
            />
            <span className="text-white text-[10px] font-black uppercase tracking-wider">Estado Crítico</span>
          </motion.div>
        )}

        {/* Fondo glow radial */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 100% 100%, ${config.glowColor}, transparent 70%)` }} />
        {/* Línea top accent */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: config.accentLine }} />

        <div className="relative flex items-center gap-4 p-5 pt-10">

          {/* ── Círculo de progreso ───────────────────────────────────── */}
          <div className="relative flex-shrink-0 flex flex-col items-center gap-2">
            <div className="relative">
              <svg width="116" height="116" viewBox="0 0 116 116">
                {/* Halo exterior animado (solo crítico) */}
                {config.isCritical && (
                  <motion.circle cx="58" cy="58" r={R + 6}
                    fill="none" stroke="rgba(220,38,38,0.18)" strokeWidth="1"
                    strokeDasharray="4 5"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "58px 58px", transform: "rotate(0deg)" }}
                  />
                )}
                {/* Track */}
                <circle cx="58" cy="58" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                {/* Arco progreso */}
                <motion.circle
                  cx="58" cy="58" r={R} fill="none"
                  stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: dashoffset }}
                  transition={{ duration: 1.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    transformOrigin: "58px 58px", transform: "rotate(-90deg)",
                    filter: `drop-shadow(0 0 10px ${ringGlow})`,
                  }}
                />
                {/* Porcentaje */}
                <text x="58" y="53" textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="22" fontWeight="900" fontFamily="inherit" letterSpacing="-1">
                  {esNuevo ? "—" : `${Math.round(topicPct)}%`}
                </text>
                {/* Sub-label dentro del ring */}
                <text x="58" y="68" textAnchor="middle" dominantBaseline="middle"
                  fill={ringColor} fontSize="8" fontWeight="700" fontFamily="inherit" letterSpacing="0.5">
                  {esNuevo ? "sin datos" : hitoActual.sublabel}
                </text>
              </svg>
            </div>
            {/* Label badge debajo */}
            {config.label && (
              <motion.span
                animate={config.isCritical ? { boxShadow: ["0 0 6px rgba(220,38,38,0.4)", "0 0 14px rgba(220,38,38,0.7)", "0 0 6px rgba(220,38,38,0.4)"] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wider uppercase"
                style={{
                  background: `${config.ringColor}25`,
                  color: config.ringColor,
                  border: `1px solid ${config.ringColor}50`,
                }}
              >
                {config.label}
              </motion.span>
            )}
          </div>

          {/* ── Bloque de texto ──────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0">
            {/* Etiqueta RECOMENDADO */}
            {config.isCritical && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em]"
                style={{ color: "rgba(252,165,165,0.8)" }}>
                ✨ Recomendado para ti
              </span>
            )}
            {/* Título */}
            <h3 className="text-white font-black text-lg leading-tight" style={{ letterSpacing: "-0.3px" }}>
              {config.titulo.split("\n").map((line, i) => (
                <React.Fragment key={i}>{line}{i < config.titulo.split("\n").length - 1 && <br />}</React.Fragment>
              ))}
            </h3>
            {/* Descripción */}
            <div className="flex flex-col gap-0.5">
              <p className="text-slate-400 text-xs leading-snug">{config.desc1}</p>
              {config.desc2 && (
                <p className="text-xs leading-snug font-medium" style={{ color: nivel === "bajo" ? "rgba(252,165,165,0.7)" : "rgba(196,181,253,0.7)" }}>
                  {config.desc2}
                </p>
              )}
            </div>
            {/* Botón CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ filter: "brightness(1.1)" }}
              onClick={() =>
                nivel === "medio" && catDebil
                  ? onIniciar("inteligente", clase, catDebil)
                  : onIniciar(config.modo)
              }
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-sm text-white outline-none border-0 w-full mt-0.5"
              style={{ background: config.ctaBg, boxShadow: config.ctaShadow }}
            >
              {config.btnLabel}
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ── Plan inteligente de hoy — solo si hay debilidades reales ─────── */}
      {!esNuevo && cantDebiles > 0 && catDebil && (
        <>
          <motion.div
            className="relative rounded-2xl border overflow-hidden"
            style={{
              borderColor: "rgba(168,85,247,0.30)",
              background: "linear-gradient(145deg, rgba(22,10,38,0.98) 0%, rgba(14,6,26,0.98) 100%)",
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Glow violeta radial */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 75% 70% at 0% 50%, rgba(168,85,247,0.13), transparent 65%)" }} />
            {/* Línea superior accent */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.6), rgba(168,85,247,0.1), transparent)" }} />

            <div className="relative p-4 pt-5">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)" }}>
                  🧠
                </div>
                <div className="flex flex-col">
                  <p className="text-white text-sm font-bold leading-tight">Plan inteligente de hoy</p>
                  <p className="text-purple-400 text-xs font-medium" style={{ opacity: 0.8 }}>Basado en tus debilidades</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <motion.span
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-2xl font-black leading-none tabular-nums"
                      style={{
                        background: "linear-gradient(135deg, #f87171, #fbbf24)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: "drop-shadow(0 0 8px rgba(248,113,113,0.5))",
                        letterSpacing: "-1px",
                      }}
                    >
                      {cantDebiles}
                    </motion.span>
                    <span className="text-[8px] font-black uppercase tracking-wide"
                      style={{ color: "rgba(251,191,36,0.7)" }}>
                      {cantDebiles === 1 ? "débil" : "débiles"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Punto débil */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.18)" }}>
                <span className="text-sm">⚠️</span>
                <div className="flex flex-col gap-0">
                  <span className="text-xs text-slate-400">Tu punto débil principal</span>
                  <span className="text-sm font-bold" style={{ color: "#d8b4fe" }}>{catDebil}</span>
                </div>
              </div>

              {/* Bullets del plan + botón */}
              <div className="flex items-end gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Podemos mejorarlo hoy:</p>
                  <p className="text-xs text-slate-300">• {pregsCat} {pregsCat === 1 ? "pregunta" : "preguntas"} de {catDebil}</p>
                  {pregsMix > 0 && <p className="text-xs text-slate-400">• {pregsMix} preguntas de repaso general</p>}
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Tiempo estimado: {tiempoEst} min
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ filter: "brightness(1.1)" }}
                  onClick={() => onIniciar("inteligente", clase, catDebil)}
                  className="flex-shrink-0 flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-sm text-white outline-none border-0"
                  style={{
                    background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                    boxShadow: "0 4px 18px rgba(168,85,247,0.40)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Empezar ahora
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// ── Sección Inicio ─────────────────────────────────────────────────────────────
function SeccionInicio({ user, datos, loading, onIniciar, onBanco, onAbrirDetalle, loadingDetalle, onEliminar, adaptativo, probabilidad, clase, tresHitos }) {
  const [eliminando, setEliminando] = useState(null);

  const handleEliminar = (id) => {
    setEliminando(id);
    setTimeout(() => onEliminar(id), 320);
  };

  const handleEliminarBtn = (e, id) => {
    e.stopPropagation();
    setEliminando(id);
    setTimeout(() => onEliminar(id), 320);
  };

  // Calcular pctTotal desde tresHitos para la barra global
  const hitosActivos = [tresHitos?.hito1, tresHitos?.hito2, tresHitos?.hito3].filter(h => h?.activo);
  const pctTotal = hitosActivos.length > 0
    ? Math.round(hitosActivos.reduce((s, h) => s + h.pct, 0) / 3)
    : 0;
  const sinDatosGlobal = !datos || datos.examenes.length === 0;

  return (
    <div className="flex flex-col gap-5 p-5 md:p-8 pb-36 md:pb-10">

      {/* ── Barra de Progreso Global — promedio de los 3 hitos ───────────── */}
      <GlobalProgressBar globalPct={pctTotal} sinDatos={sinDatosGlobal} />

      {/* ── Hero Progreso (versión refinada) ──────────────────────────────── */}
      <HeroProgreso
        probabilidad={probabilidad}
        adaptativo={adaptativo}
        datos={datos}
        onIniciar={onIniciar}
        loading={loading}
        clase={clase}
        tresHitos={tresHitos}
      />

      {/* ── Card Modo Examen ──────────────────────────────────────────────── */}
      {(() => {
        const examenes = datos?.examenes ?? [];
        const examenesExamen = examenes.filter(e => e.modo === "examen" || !e.modo);
        const ultimo = examenesExamen[0];
        const ultimoLabel = ultimo ? `${ultimo.correctas}/${ultimo.total}` : null;
        const ultimoOk = ultimo ? ultimo.puntaje_obtenido >= 33 : false;

        // Racha de aprobados (cualquier modo)
        let racha = 0;
        for (const ex of examenes) {
          if (ex.puntaje_obtenido >= 33) racha++;
          else break;
        }

        // Mejor puntaje en modo examen
        const mejorPts = examenesExamen.length > 0
          ? Math.max(...examenesExamen.map(e => e.puntaje_obtenido))
          : null;

        return (
          <>
            {/* Label sección entrenamiento libre */}
            <div className="flex items-center gap-2.5 px-0.5 mt-1">
              <span className="text-sm font-black uppercase tracking-widest text-white">🎯 Entrenamiento Libre</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
          <motion.div {...fadeUp(0.3)} className="relative rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 32px rgba(37,99,235,0.18), 0 1px 0 rgba(99,179,255,0.08) inset" }}>
            {/* Fondo glassmorphism */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(145deg, rgba(15,25,60,0.97) 0%, rgba(10,18,45,0.99) 100%)",
              borderRadius: "inherit",
            }} />
            {/* Borde degradado */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              border: "1px solid transparent",
              background: "linear-gradient(145deg, rgba(99,179,255,0.35), rgba(37,99,235,0.18), rgba(29,78,216,0.08)) border-box",
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              maskComposite: "exclude",
            }} />
            {/* Glow radial esquina */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse 65% 55% at 100% 0%, rgba(59,130,246,0.14), transparent 70%)",
            }} />
            {/* Línea superior accent cian */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: "linear-gradient(90deg, transparent, rgba(99,220,255,0.5), rgba(59,130,246,0.6), rgba(99,220,255,0.3), transparent)",
            }} />

            <div className="relative p-5">
              {/* ── Fila superior: icono + título + badge ── */}
              <div className="flex items-start gap-3 mb-4">
                {/* Icono cronómetro */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(37,99,235,0.20)", border: "1px solid rgba(99,179,255,0.25)", boxShadow: "0 0 18px rgba(37,99,235,0.25)" }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="13" r="8" stroke="#60a5fa" strokeWidth="1.8"/>
                    <path d="M12 9v4l2.5 2.5" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 2h6M12 2v3" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M19.5 6.5l-1 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black text-base leading-tight">Modo Examen</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(99,220,255,0.12)", color: "#67e8f9", border: "1px solid rgba(99,220,255,0.22)" }}>
                      Simulación Real
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 leading-snug">
                    Puntaje CONASET · Sin retroalimentación · Condiciones reales
                  </p>
                </div>
              </div>

              {/* ── Chips de metadata ── */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span className="text-xs text-slate-400 font-medium">35 min</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs text-slate-400 font-medium">35 preguntas</span>
                </div>
                {mejorPts !== null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-xs font-bold" style={{ color: "#6ee7b7" }}>Récord: {mejorPts} pts</span>
                  </div>
                )}
              </div>

              {/* ── Stats recientes (si hay exámenes) ── */}
              {(ultimoLabel || racha >= 2) && (
                <div className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {ultimoLabel && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ultimoOk ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-xs text-slate-500">Último:</span>
                      <span className={`text-xs font-bold ${ultimoOk ? "text-emerald-400" : "text-red-400"}`}>{ultimoLabel}</span>
                      {/* Mini barra */}
                      {ultimo && (
                        <div className="flex-1 h-1 rounded-full overflow-hidden ml-1" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className={`h-full rounded-full ${ultimoOk ? "bg-emerald-500" : "bg-red-500"}`}
                            style={{ width: `${Math.round((ultimo.correctas / ultimo.total) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                  {racha >= 2 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm">🔥</span>
                      <span className="text-xs font-bold text-amber-400">{racha} aprobados seguidos</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Botón CTA ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ filter: "brightness(1.1)" }}
                onClick={() => onIniciar("examen", clase)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm text-white outline-none border-0"
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)",
                  boxShadow: "0 4px 20px rgba(29,78,216,0.45), 0 1px 0 rgba(99,179,255,0.15) inset",
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
                </svg>
                Iniciar examen
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Tarjeta Modo Estudio ── */}
          <motion.div {...fadeUp(0.35)} className="relative rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.12), 0 1px 0 rgba(253,230,138,0.06) inset" }}>
            {/* Fondo */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(145deg, rgba(30,20,5,0.97) 0%, rgba(20,14,2,0.99) 100%)",
              borderRadius: "inherit",
            }} />
            {/* Borde degradado ámbar */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              border: "1px solid transparent",
              background: "linear-gradient(145deg, rgba(253,186,48,0.30), rgba(245,158,11,0.14), rgba(180,110,0,0.06)) border-box",
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              maskComposite: "exclude",
            }} />
            {/* Línea superior accent ámbar */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: "linear-gradient(90deg, transparent, rgba(253,186,48,0.45), rgba(245,158,11,0.55), rgba(253,186,48,0.3), transparent)",
            }} />

            <div className="relative p-5">
              {/* ── Fila superior ── */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(253,186,48,0.25)", boxShadow: "0 0 14px rgba(245,158,11,0.20)" }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 017-7z" stroke="#fbbf24" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M9 21h6M10 17v4M14 17v4" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black text-base leading-tight">Modo Estudio</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(253,186,48,0.12)", color: "#fcd34d", border: "1px solid rgba(253,186,48,0.22)" }}>
                      Con explicaciones
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 leading-snug">
                    Feedback inmediato · Aprende de cada error · Sin límite de tiempo
                  </p>
                </div>
              </div>

              {/* ── Chips ── */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 017-7z" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round"/></svg>
                  <span className="text-xs text-slate-400 font-medium">Sin tiempo</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs text-slate-400 font-medium">35 preguntas</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}>
                  <span className="text-xs" style={{ color: "#6ee7b7" }}>💡 Explicación en cada respuesta</span>
                </div>
              </div>

              {/* ── Botón CTA ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ filter: "brightness(1.1)" }}
                onClick={() => onIniciar("estudio", clase)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm text-white outline-none border-0"
                style={{
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)",
                  boxShadow: "0 4px 20px rgba(217,119,6,0.40), 0 1px 0 rgba(253,186,48,0.15) inset",
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                  <path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Estudiar ahora
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
              </motion.button>
            </div>
          </motion.div>
          </>
        );
      })()}

    </div>
  );
}

// ── Sección Historial ──────────────────────────────────────────────────────────
function SeccionHistorial({ datos, loading, onAbrirDetalle, loadingDetalle, onEliminar }) {
  const [eliminados, setEliminados] = useState([]);

  const handleEliminar = (id) => {
    setEliminados(prev => [...prev, id]);
    setTimeout(() => onEliminar && onEliminar(id), 320);
  };

  const handleEliminarBtn = (e, id) => {
    e.stopPropagation();
    handleEliminar(id);
  };

  return (
    <div className="flex flex-col gap-5 p-5 md:p-8 pb-36 md:pb-10">
      <motion.div {...fadeUp(0.05)}>
        <h2 className="text-white font-black text-xl">Historial</h2>
        <p className="text-slate-500 text-sm mt-0.5">Todos tus exámenes completados</p>
      </motion.div>
      {loading ? (
        <div className="flex flex-col gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} />)}</div>
      ) : datos?.examenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-5xl mb-4">🎯</motion.div>
          <p className="text-white font-bold text-lg mb-1">Sin exámenes aún</p>
          <p className="text-slate-500 text-sm">Completa tu primer examen para ver el historial aquí.</p>
        </div>
      ) : (
        <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-slate-800/60 overflow-hidden">
          {datos.examenes.map((ex, i) => {
            const ok = ex.puntaje_obtenido >= 33;
            const pct = Math.round((ex.correctas / ex.total) * 100);
            return (
              <SwipeToDelete key={ex.id} onDelete={() => handleEliminar(ex.id)} disabled={loadingDetalle}>
                <div className="border-b border-slate-800/40 last:border-0">
                  <div className="flex items-center">
                    <button onClick={() => onAbrirDetalle(ex)} disabled={loadingDetalle}
                      className="bg-transparent flex items-center gap-3 px-4 py-4 flex-1 min-w-0 text-left transition-colors hover:bg-white/5 outline-none">
                      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-slate-300 text-sm font-semibold">
                            {new Date(ex.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                          </span>
                          {ex.clase && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${ex.clase === "C" ? "bg-orange-500/20 text-orange-400" : "bg-slate-700/60 text-slate-400"}`}>{ex.clase}</span>
                          )}
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${ex.modo === "estudio" ? "bg-amber-500/20 text-amber-400" : ex.modo === "inteligente" ? "bg-pink-500/20 text-pink-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {ex.modo === "estudio" ? "Estudio" : ex.modo === "inteligente" ? "🧠 Inteligente" : "Examen"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.05 + i * 0.03, duration: 0.5 }} />
                          </div>
                          <span className="text-xs text-slate-500 flex-shrink-0">{ex.correctas}/{ex.total}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className={`text-base font-black ${ok ? "text-emerald-400" : "text-red-400"}`}>
                          {ex.puntaje_obtenido}<span className="text-xs font-normal text-slate-600"> pts</span>
                        </span>
                        <span className={`text-xs font-semibold ${ok ? "text-emerald-500/70" : "text-red-500/70"}`}>
                          {ok ? "Aprobado" : "Reprobado"}
                        </span>
                      </div>
                      <span className="text-slate-700 flex-shrink-0 ml-1"><IconArrow size={13} /></span>
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleEliminarBtn(e, ex.id)}
                      className="hidden md:flex flex-shrink-0 w-10 h-10 mr-2 rounded-xl items-center justify-center transition-colors bg-transparent border-0 outline-none"
                      style={{ color: "#64748b" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                      title="Eliminar examen">
                      🗑︎
                    </motion.button>
                  </div>
                </div>
              </SwipeToDelete>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ── Sección Estadísticas ───────────────────────────────────────────────────────
// ─── SMART STATISTICS UPGRADE ─────────────────────────────────────────────────

const CRITICAL_CATEGORIES = new Set([
  "Alcohol y Drogas",
  "Velocidad",
  "Sistemas de retención infantil",
]);

const CATEGORY_WEIGHT = {
  "Señales de Tránsito":   0.20,
  "Normas de Tránsito":    0.18,
  "Conducta Vial":         0.12,
  "Conducción segura":     0.08,
  "Prioridad de paso":     0.07,
  "Velocidad":             0.05,
  "Alcohol y Drogas":      0.05,
  "Semáforos":             0.04,
  "Demarcación":           0.04,
  "Convivencia Vial":      0.04,
  "Conocimientos Legales": 0.04,
  "Mecánica Básica":       0.03,
  "Condiciones climáticas":0.02,
};

function getThemeStats(clase) {
  return clase === "C"
    ? {
        primary:       "#d97706",
        primaryGlow:   "rgba(217,119,6,0.14)",
        primaryBorder: "rgba(217,119,6,0.32)",
        primaryText:   "#fcd34d",
        ctaBg:         "linear-gradient(135deg,#d97706,#b45309)",
      }
    : {
        primary:       "#3b82f6",
        primaryGlow:   "rgba(59,130,246,0.13)",
        primaryBorder: "rgba(59,130,246,0.32)",
        primaryText:   "#93c5fd",
        ctaBg:         "linear-gradient(135deg,#2563eb,#1d4ed8)",
      };
}

function calcPriorityScore(cat) {
  const errorRate = 1 - cat.pct / 100;
  const weight    = CRITICAL_CATEGORIES.has(cat.categoria) ? 2 : 1;
  const bonus     = cat.recentFail ? 0.3 : 0;
  return errorRate * weight + bonus;
}

function estimateImpact(cat) {
  const catWeight  = CATEGORY_WEIGHT[cat.categoria] ?? 0.03;
  const isCritical = CRITICAL_CATEGORIES.has(cat.categoria);
  const gain       = (0.85 - cat.pct / 100) * catWeight;
  return Math.max(0, Math.round(Math.min(gain * (isCritical ? 2.2 : 1.4) * 100, 20)));
}

function calcWeightedProb(statsCategoria) {
  if (!statsCategoria || statsCategoria.length === 0) return null;
  let weighted = 0, total = 0;
  for (const cat of statsCategoria) {
    const w = (CATEGORY_WEIGHT[cat.categoria] ?? 0.03) * (CRITICAL_CATEGORIES.has(cat.categoria) ? 2 : 1);
    weighted += (cat.pct / 100) * w;
    total    += w;
  }
  return total === 0 ? null : Math.round((weighted / total) * 100);
}

function estimateTimeToGoal(prob) {
  if (!prob) return null;
  if (prob >= 85) return "~3 días";
  const days = Math.ceil((85 - prob) / 5);
  return days <= 7 ? `${days} días` : `~${Math.ceil(days / 7)} semanas`;
}

function getRecomendacion(weaknesses, prob) {
  if (!weaknesses || weaknesses.length === 0) return null;
  const top   = weaknesses[0];
  const isCrit = CRITICAL_CATEGORIES.has(top.categoria);
  if (isCrit && top.errorRate > 0.4)
    return { urgency: "alta",  text: `⚠️ Urgente: fallaste ${top.categoria} — categoría crítica con doble peso. Practica SOLO esta temática hoy.`,       cta: "inteligente" };
  if (prob && prob >= 75)
    return { urgency: "baja",  text: `Vas muy bien. Refuerza ${top.categoria} para asegurar el margen y luego simula un examen final.`,                    cta: "examen" };
  return       { urgency: "media", text: `Enfócate en ${top.categoria} primero — corregir esta categoría te da el mayor salto de probabilidad.`,              cta: "inteligente" };
}

// ── Iconos stats ───────────────────────────────────────────────────────────────
const IconTarget   = () => (<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconZap      = () => (<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconClock    = () => (<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconWarnStat = () => (<svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconPlayStat = () => (<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M10 8l6 4-6 4V8z" fill="currentColor"/></svg>);
const IconChevron  = ({ open }) => (<svg width="12" height="12" fill="none" viewBox="0 0 24 24" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconArrowRight = () => (<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);

// ═══════════════════════════════════════════════════════════════════════════════
// ── NUEVA SECCIÓN ESTADÍSTICAS — ESTILO GOOGLE FINANCE ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── MiniLineChart (SVG puro, sin dependencias) ─────────────────────────────────
// Mapa de emojis por categoría
const CATEGORIA_EMOJI = {
  "Señales de Tránsito":    "🚦",
  "Normas de Tránsito":     "📋",
  "Conducta Vial":          "🛣️",
  "Conducción segura":      "🛡️",
  "Prioridad de paso":      "⬆️",
  "Velocidad":              "⚡",
  "Alcohol y Drogas":       "🍺",
  "Semáforos":              "🔴",
  "Demarcación":            "🟡",
  "Convivencia Vial":       "🤝",
  "Conocimientos Legales":  "⚖️",
  "Mecánica Básica":        "🔧",
  "Condiciones climáticas": "🌧️",
  "Señalización":           "🔶",
};

function MiniLineChart({ data, color = "#3b82f6", height = 150, examenes = [] }) {
  const [hovered, setHovered] = useState(null);
  const containerRef = React.useRef(null);
  const [containerW, setContainerW] = useState(800);
  const [containerH, setContainerH] = useState(height);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setContainerW(e.contentRect.width);
      setContainerH(e.contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-slate-600 text-xs" style={{ height }}>
        Sin suficientes datos
      </div>
    );
  }

  // ── Usar píxeles reales para evitar distorsión de texto ──────────────────────
  const W = containerW || 600;
  const H = height;
  const PAD = { top: 12, bottom: 28, left: 8, right: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.value);
  const minV = Math.max(0,   Math.min(...values) - 8);
  const maxV = Math.min(100, Math.max(...values) + 8);
  const range = maxV - minV || 1;

  const toX = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }));

  // Bezier suavizado
  const curvePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }).join(" ");
  const areaPath = `${curvePath} L ${pts[pts.length - 1].x} ${H - PAD.bottom} L ${pts[0].x} ${H - PAD.bottom} Z`;

  const gradId = `grad-${color.replace("#", "")}-lc`;

  // ── Posición del tooltip: nunca se sale del contenedor ──────────────────────
  const TOOLTIP_W = 224;
  const getTooltipLeft = (px) => {
    // Si el punto está en los últimos 35% del contenedor, mostrar a la izquierda
    if (px / W > 0.65) return `${px - TOOLTIP_W - 12}px`;
    return `${px + 12}px`;
  };

  const hoveredExamen = hovered !== null ? (data[hovered].examen ?? null) : null;

  return (
    <div className="relative w-full select-none" style={{ height }} ref={containerRef}>
      {/* SVG sin preserveAspectRatio=none → el texto NO se deforma */}
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full absolute inset-0"
        onMouseLeave={() => setHovered(null)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="88%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Área */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Línea 85% */}
        {(() => {
          const refY = toY(85);
          if (refY >= PAD.top && refY <= H - PAD.bottom) {
            return (
              <>
                <line x1={PAD.left} y1={refY} x2={W - PAD.right} y2={refY}
                  stroke="rgba(16,185,129,0.45)" strokeWidth="1" strokeDasharray="5 4" />
                <text x={W - PAD.right - 4} y={refY - 3} textAnchor="end"
                  fill="rgba(16,185,129,0.75)" fontSize="10" fontFamily="ui-monospace,monospace">85%</text>
              </>
            );
          }
          return null;
        })()}

        {/* Línea curva */}
        <path d={curvePath} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}99)` }} />

        {/* Puntos pequeños */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 0 : 3}
            fill={p.aprobado ? "#10b981" : "#ef4444"} fillOpacity="0.85" />
        ))}

        {/* Crosshair + dot activo */}
        {hovered !== null && (
          <>
            <line x1={pts[hovered].x} y1={PAD.top}
              x2={pts[hovered].x} y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={pts[hovered].x} cy={pts[hovered].y} r="5" fill={color} fillOpacity="0.2" />
            <circle cx={pts[hovered].x} cy={pts[hovered].y} r="3.5" fill={color}
              style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          </>
        )}

        {/* Zonas hover — rect invisibles por cada punto */}
        {pts.map((p, i) => (
          <rect key={i}
            x={i === 0 ? 0 : (pts[i-1].x + p.x) / 2}
            y={0}
            width={i === 0
              ? (pts[1].x + p.x) / 2
              : i === pts.length - 1
                ? W - (pts[i-1].x + p.x) / 2
                : (p.x - pts[i-1].x)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            style={{ cursor: "crosshair" }} />
        ))}

        {/* Eje X — fechas en píxeles reales → no se deforman */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((idx) => {
          if (idx >= data.length) return null;
          const ax = toX(idx);
          return (
            <text key={idx}
              x={idx === 0 ? ax + 4 : idx === data.length - 1 ? ax - 4 : ax}
              y={H - 8}
              textAnchor={idx === 0 ? "start" : idx === data.length - 1 ? "end" : "middle"}
              fill="rgba(100,116,139,0.75)"
              fontSize="11"
              fontFamily="ui-monospace,monospace">
              {data[idx].label}
            </text>
          );
        })}
      </svg>

      {/* ── Tooltip enriquecido (HTML — no se deforma nunca) ── */}
      <AnimatePresence>
        {hovered !== null && hoveredExamen && (
          <motion.div
            key={hovered}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute pointer-events-none z-50"
            style={{
              left: getTooltipLeft(pts[hovered].x),
              top: Math.max(4, pts[hovered].y - 20),
              width: TOOLTIP_W,
            }}>
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(8,12,24,0.98)",
                border: "1px solid rgba(255,255,255,0.11)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
              }}>
              {/* Header */}
              <div className="px-4 pt-3.5 pb-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-white text-xs font-black leading-snug">
                  Examen #{hoveredExamen.numero ?? (hovered + 1)}
                  <span className="text-slate-500 font-normal ml-1.5 text-[11px]">
                    ({new Date(hoveredExamen.created_at).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })})
                  </span>
                </p>
              </div>

              {/* Stats */}
              <div className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Puntaje:</span>
                  <span className="text-white text-xs font-bold tabular-nums">
                    {Math.round((hoveredExamen.correctas / hoveredExamen.total) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Resultado:</span>
                  <span className={`text-xs font-bold ${hoveredExamen.puntaje_obtenido >= 33 ? "text-emerald-400" : "text-red-400"}`}>
                    {hoveredExamen.puntaje_obtenido >= 33 ? "✅ Aprobado" : "❌ Reprobado"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Correctas / Total:</span>
                  <span className="text-white text-xs font-bold tabular-nums">
                    {hoveredExamen.correctas} / {hoveredExamen.total}
                  </span>
                </div>
              </div>

              {/* Errores principales */}
              {hoveredExamen.topErrores && hoveredExamen.topErrores.length > 0 && (
                <div className="px-4 pb-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <p className="text-slate-500 text-[11px] mb-2 uppercase tracking-wide">Errores principales:</p>
                  {hoveredExamen.topErrores.map((err, j) => (
                    <div key={j} className="flex items-center gap-2 mb-1.5">
                      <span className="text-red-400 text-xs">–</span>
                      <span className="text-slate-300 text-xs truncate flex-1">{err.categoria}</span>
                      <span className="text-red-400 text-xs font-bold tabular-nums flex-shrink-0">({err.count})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="px-3 pb-3.5">
                <div className="px-3 py-2 rounded-xl text-center text-xs font-bold"
                  style={{ background: "rgba(59,130,246,0.18)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                  Revisar corrección de este examen →
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tooltip mínimo si no hay examen enriquecido */}
        {hovered !== null && !hoveredExamen && (
          <motion.div key={`simple-${hovered}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute pointer-events-none px-3 py-1.5 rounded-xl text-xs font-bold text-white z-40"
            style={{
              left: getTooltipLeft(pts[hovered].x),
              top: Math.max(4, pts[hovered].y - 36),
              background: "rgba(8,12,24,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              whiteSpace: "nowrap",
            }}>
            {pts[hovered].value}%
            <span className="text-slate-500 font-normal ml-1.5">{pts[hovered].label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Construye serie temporal a partir de examenes ──────────────────────────────
function buildTimeSeries(examenes, days) {
  if (!examenes || examenes.length === 0) return [];
  const now = Date.now();
  const cutoff = days === Infinity ? 0 : now - days * 24 * 60 * 60 * 1000;
  const filtered = examenes
    .filter(e => new Date(e.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return filtered.map((e, idx) => ({
    value: Math.round((e.correctas / e.total) * 100),
    label: new Date(e.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
    date: e.created_at,
    aprobado: e.puntaje_obtenido >= 33,
    examen: {
      ...e,
      numero: idx + 1,
      topErrores: e.erroresPorCategoria
        ? Object.entries(e.erroresPorCategoria)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([categoria, count]) => ({ categoria, count }))
        : [],
    },
  }));
}

// ── Calcula tendencia entre primera mitad y segunda mitad de la serie ──────────
function calcTrend(series) {
  if (series.length < 2) return null;
  const half = Math.ceil(series.length / 2);
  const first = series.slice(0, half).reduce((s, d) => s + d.value, 0) / half;
  const second = series.slice(half).reduce((s, d) => s + d.value, 0) / (series.length - half);
  return Math.round(second - first);
}

// ── HeroMetric — número grande + tendencia ─────────────────────────────────────
function HeroMetric({ prob, trend, timeRange, onTimeRange, series, theme }) {
  const hasTrend = trend !== null && series.length >= 2;
  const isUp = hasTrend && trend >= 0;
  const trendColor = isUp ? "#10b981" : "#ef4444";
  const trendBg = isUp ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";
  const rangeLabels = { 7: "7 días", 15: "14 días", 30: "30 días", Infinity: "Todo" };
  const rangeLabelShort = { 7: "7D", 15: "15D", 30: "1M", Infinity: "Todo" };
  const lineColor = prob === null ? "#475569" : prob < 50 ? "#ef4444" : prob < 75 ? "#f59e0b" : "#10b981";

  // Texto de tendencia estilo "últimas 2 semanas"
  const trendLabel = timeRange === Infinity
    ? "historial completo"
    : timeRange === 7 ? "última semana"
    : timeRange === 15 ? "últimas 2 semanas"
    : "último mes";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl border"
      style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>

      {/* ── Parte superior: métrica + tendencia ── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-end gap-3 flex-wrap">
              <motion.span
                key={prob}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-black text-white leading-none"
                style={{ fontSize: "clamp(2.5rem,8vw,3.5rem)", letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>
                {prob !== null ? `${prob}%` : "—"}
              </motion.span>
              {hasTrend && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold mb-1"
                  style={{ background: trendBg, color: trendColor }}>
                  {isUp ? "↗" : "↘"} {isUp ? "+" : ""}{trend}% ({trendLabel})
                </motion.span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1.5">
              Probabilidad de aprobar <span className="text-slate-600">· Análisis inteligente</span>
            </p>
            <p className="text-slate-600 text-xs mt-0.5">El umbral de confianza para el examen real es 85%</p>
          </div>

          {/* Selectores de tiempo */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 flex-shrink-0">
            {[7, 15, 30, Infinity].map(d => (
              <button key={d} onClick={() => onTimeRange(d)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border-0 outline-none"
                style={timeRange === d
                  ? { background: theme.primary, color: "white", boxShadow: `0 2px 8px ${theme.primary}55` }
                  : { background: "transparent", color: "#64748b" }}>
                {rangeLabelShort[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gráfico de línea con tooltip enriquecido ── */}
      <div className="px-1 pb-1 overflow-visible relative z-10">
        {series.length >= 2 ? (
          <MiniLineChart data={series} color={lineColor} height={160} />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <span className="text-3xl">📈</span>
            <p className="text-slate-500 text-sm font-semibold">Sin suficientes datos en este período</p>
            <p className="text-slate-600 text-xs">Necesitas al menos 2 exámenes</p>
          </div>
        )}
      </div>

      {/* ── Footer: umbral 85% ── */}
      <div className="mx-4 mb-4 px-3 py-2 rounded-xl flex items-center gap-2"
        style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <span className="text-xs" style={{ color: "#10b981", letterSpacing: 2 }}>─ ─</span>
        <p className="text-xs text-slate-400">
          Línea verde punteada = umbral 85% · Pasa el cursor sobre el gráfico para ver detalles de cada ensayo
        </p>
      </div>
    </motion.div>
  );
}

// ── WeaknessTable — lista estilo cotizaciones (con emoji + Acción) ─────────────
function WeaknessTable({ weaknesses, theme, onPractice }) {
  // Badge por estado de dominio
  const badgeFor = (pct, isCrit) => {
    if (isCrit && pct < 50) return { label: "Crítico (x2)", dot: "#ef4444", bg: "rgba(239,68,68,0.14)", color: "#fca5a5" };
    if (pct >= 75)  return { label: "Mejorando",  dot: "#f59e0b",  bg: "rgba(245,158,11,0.12)", color: "#fcd34d" };
    if (pct >= 50)  return { label: "Alerta",     dot: "#f97316",  bg: "rgba(249,115,22,0.12)", color: "#fdba74" };
    return            { label: "Crítico",          dot: "#ef4444",  bg: "rgba(239,68,68,0.14)", color: "#fca5a5" };
  };

  // Impacto label
  const impactoFor = (cat) => {
    const isCrit = CRITICAL_CATEGORIES.has(cat.categoria);
    if (isCrit) return { label: "Crítico (x2)", color: "#fca5a5" };
    if (cat.impact >= 10) return { label: "Alto",   color: "#fdba74" };
    if (cat.impact >= 5)  return { label: "Medio",  color: "#fcd34d" };
    return                 { label: "Bajo",    color: "#94a3b8" };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="rounded-2xl border"
      style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>

      {/* Header tabla — 5 columnas como en el diseño */}
      <div className="hidden sm:grid px-4 py-2.5 border-b"
        style={{ gridTemplateColumns: "1fr 68px 90px 80px 76px", borderColor: "rgba(255,255,255,0.05)" }}>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest">Categoría</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Dominio (%)</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Impacto</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Estado</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Acción</span>
      </div>

      {/* Filas */}
      {weaknesses.map((cat, i) => {
        const isCrit   = CRITICAL_CATEGORIES.has(cat.categoria);
        const badge    = badgeFor(cat.pct, isCrit);
        const impacto  = impactoFor(cat);
        const pctColor = cat.pct < 50 ? "#ef4444" : cat.pct < 70 ? "#f59e0b" : "#10b981";
        const emoji    = CATEGORIA_EMOJI[cat.categoria] ?? "📌";

        return (
          <motion.div
            key={cat.categoria}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.28 }}
            className="border-b last:border-0 hover:bg-white/[0.025] transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}>

            {/* ── Layout desktop (grid 5 cols) ── */}
            <div className="hidden sm:grid items-center px-4 py-3"
              style={{ gridTemplateColumns: "1fr 68px 90px 80px 76px" }}>

              {/* Categoría con emoji */}
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-base flex-shrink-0">{emoji}</span>
                <span className="text-slate-200 text-sm font-semibold truncate">{cat.categoria}</span>
              </div>

              {/* Dominio % */}
              <div className="flex items-center justify-end">
                <span className="text-sm font-black tabular-nums" style={{ color: pctColor }}>
                  {cat.pct}%
                </span>
              </div>

              {/* Impacto */}
              <div className="flex items-center justify-end">
                <span className="text-xs font-bold" style={{ color: impacto.color }}>
                  {impacto.label}
                </span>
              </div>

              {/* Estado — dot + label */}
              <div className="flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: badge.dot }} />
                <span className="text-xs font-bold" style={{ color: badge.color }}>
                  {badge.label}
                </span>
              </div>

              {/* Botón Repasar */}
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={() => onPractice(cat.categoria)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-0 outline-none transition-all"
                  style={{
                    background: isCrit ? "rgba(239,68,68,0.18)" : "rgba(59,130,246,0.18)",
                    color: isCrit ? "#fca5a5" : "#93c5fd",
                    border: `1px solid ${isCrit ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                  }}>
                  Repasar
                </motion.button>
              </div>
            </div>

            {/* ── Layout móvil (compacto) ── */}
            <button onClick={() => onPractice(cat.categoria)}
              className="sm:hidden w-full flex items-center gap-3 px-4 py-3.5 bg-transparent border-0 outline-none text-left">
              <span className="text-lg flex-shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-slate-200 text-sm font-semibold truncate">{cat.categoria}</span>
                  {isCrit && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5" }}>×2</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${cat.pct}%` }}
                      transition={{ duration: 0.5, delay: 0.06 * i }}
                      style={{ background: pctColor }} />
                  </div>
                  <span className="text-xs font-black flex-shrink-0 tabular-nums" style={{ color: pctColor }}>{cat.pct}%</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: badge.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                  {badge.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                  Repasar
                </span>
              </div>
            </button>
          </motion.div>
        );
      })}

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-xs text-slate-600 text-center">
          Impacto = criticidad de la categoría · Repasar lanza Modo Inteligente enfocado
        </p>
      </div>
    </motion.div>
  );
}

// ── AllCategoriesTable — tabla compacta todas las categorías ───────────────────
function AllCategoriesTable({ allCats, showAll, onToggle, theme }) {
  const visible = showAll ? allCats : allCats.slice(0, 6);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>

      <div className="grid px-4 py-2.5 border-b"
        style={{ gridTemplateColumns: "1fr 60px 80px", borderColor: "rgba(255,255,255,0.05)" }}>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest">Todas las categorías</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Resp.</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest text-right">Dominio</span>
      </div>

      {visible.map(({ categoria, pct, total }, i) => {
        const isCrit = CRITICAL_CATEGORIES.has(categoria);
        const barColor = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
        return (
          <motion.div key={categoria}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.32 + i * 0.025 }}
            className="grid px-4 py-3 border-b last:border-0 items-center"
            style={{ gridTemplateColumns: "1fr 60px 80px", borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="flex flex-col gap-1 pr-3 min-w-0">
              <div className="flex items-center gap-1.5">
                {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                <span className="text-slate-300 text-sm font-medium truncate">{categoria}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.025, ease: "easeOut" }}
                  style={{ background: barColor }} />
              </div>
            </div>
            <span className="text-xs text-slate-600 text-right">{total}</span>
            <span className="text-sm font-black text-right tabular-nums" style={{ color: barColor }}>{pct}%</span>
          </motion.div>
        );
      })}

      {allCats.length > 6 && (
        <button onClick={onToggle}
          className="w-full py-3 text-xs font-semibold border-t bg-transparent border-0 outline-none hover:bg-white/[0.02] transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: theme.primaryText }}>
          {showAll ? "Ver menos ↑" : `Ver ${allCats.length - 6} más ↓`}
        </button>
      )}
    </motion.div>
  );
}

// ── ProbabilityCompareCard (legacy — REEMPLAZADA, se mantiene por compatibilidad) ─
function ProbabilityCompareCard({ currentProb, projectedProb, theme, timeToGoal }) {
  const hasCurrent = currentProb !== null && currentProb !== undefined;
  const cur  = hasCurrent ? currentProb : 0;
  const proj = projectedProb || Math.min(cur + 15, 99);
  const R    = 46, CIRC = 2 * Math.PI * R;
  const curColor  = cur  < 50 ? "#ef4444" : cur  < 75 ? "#f59e0b" : "#10b981";
  const projColor = "#10b981";
  const curOffset  = CIRC * (1 - cur  / 100);
  const projOffset = CIRC * (1 - proj / 100);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl border p-4"
      style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-400">
          <IconTarget />
          <p className="text-xs font-semibold uppercase tracking-widest">Probabilidad de aprobar</p>
        </div>
        {timeToGoal && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: theme.primaryGlow }}>
            <IconClock />
            <span className="text-xs font-bold" style={{ color: theme.primaryText }}>{timeToGoal}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-around">
        {/* Actual */}
        <div className="flex flex-col items-center">
          <svg width="108" height="108" viewBox="0 0 108 108">
            <circle cx="54" cy="54" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
            <motion.circle cx="54" cy="54" r={R} fill="none" stroke={curColor} strokeWidth="7"
              strokeLinecap="round" strokeDasharray={CIRC} initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: curOffset }}
              transition={{ duration: 1.2, ease: [0.25,0.46,0.45,0.94] }}
              style={{ transformOrigin:"54px 54px", transform:"rotate(-90deg)", filter:`drop-shadow(0 0 6px ${curColor}88)` }}/>
            <text x="54" y="54" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="inherit">{hasCurrent ? `${cur}%` : "—"}</text>
          </svg>
        </div>
        {/* Arrow */}
        <div className="flex flex-col items-center gap-1">
          <motion.div animate={{ x:[0,4,0] }} transition={{ repeat:Infinity, duration:1.6 }} style={{ color:"#10b981" }}>
            <IconArrowRight />
          </motion.div>
          <span className="text-xs font-black text-emerald-400">+{proj - cur}%</span>
        </div>
        {/* Proyectado */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
              <motion.circle cx="54" cy="54" r={R} fill="none" stroke={projColor} strokeWidth="7"
                strokeLinecap="round" strokeDasharray={CIRC} initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: projOffset }}
                transition={{ duration: 1.5, delay: 0.4, ease: [0.25,0.46,0.45,0.94] }}
                style={{ transformOrigin:"54px 54px", transform:"rotate(-90deg)", filter:`drop-shadow(0 0 6px ${projColor}99)` }}/>
              <text x="54" y="54" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="inherit">{proj}%</text>
            </svg>
            <svg className="absolute inset-0 pointer-events-none" width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={R+5} fill="none" stroke="rgba(16,185,129,0.22)" strokeWidth="1.5"
                strokeDasharray="4 4" style={{ transformOrigin:"54px 54px", transform:"rotate(-90deg)" }}/>
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-3 px-3 py-2.5 rounded-xl border" style={{ background:"rgba(16,185,129,0.05)", borderColor:"rgba(16,185,129,0.18)" }}>
        <p className="text-xs text-slate-400 leading-relaxed">
          El anillo punteado indica el umbral de <span className="text-emerald-400 font-bold">85% de confianza</span> para rendir el examen real.
        </p>
      </div>
    </motion.div>
  );
}

// ── WeaknessRow ────────────────────────────────────────────────────────────────
function WeaknessRow({ cat, rank, theme, onPractice, delay }) {
  const [open, setOpen] = useState(false);
  const isCritical = CRITICAL_CATEGORIES.has(cat.categoria);
  const barColor   = cat.pct < 50 ? "#ef4444" : cat.pct < 70 ? "#f59e0b" : "#10b981";
  const rankStyle  = rank === 1
    ? { bg:"rgba(239,68,68,0.18)",  color:"#fca5a5" }
    : rank === 2
    ? { bg:"rgba(245,158,11,0.14)", color:"#fcd34d" }
    : { bg:"rgba(255,255,255,0.07)",color:"#94a3b8" };

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay, duration:0.3 }}
      className="border-b last:border-0" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-transparent border-0 outline-none text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background:rankStyle.bg, color:rankStyle.color }}>{rank}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-slate-200 text-sm font-semibold truncate">{cat.categoria}</span>
            {isCritical && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background:"rgba(239,68,68,0.14)", color:"#fca5a5" }}>
                <IconWarnStat /> Crítica ×2
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
            <motion.div className="h-full rounded-full" initial={{ width:0 }}
              animate={{ width:`${cat.pct}%` }}
              transition={{ duration:0.6, delay:delay+0.1, ease:"easeOut" }}
              style={{ background:barColor }}/>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-1">
          <span className="text-sm font-black" style={{ color:barColor }}>{cat.pct}%</span>
          <span className="text-xs font-semibold text-emerald-400">+{cat.impact}% prob.</span>
        </div>
        <span className="text-slate-600 flex-shrink-0 ml-1"><IconChevron open={open}/></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.25, ease:[0.25,0.46,0.45,0.94] }}
            className="overflow-hidden">
            <div className="px-4 pb-4 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label:"Tasa de error", val:`${Math.round(cat.errorRate * 100)}%`,  color:"#fca5a5" },
                  { label:"Peso",          val:isCritical ? "×2 crítica" : "×1 normal", color:isCritical ? "#fca5a5" : "#94a3b8" },
                  { label:"Impacto",       val:`+${cat.impact}% prob.`,                 color:"#6ee7b7" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-xl p-2"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
              <motion.button whileTap={{ scale:0.97 }} onClick={() => onPractice(cat.categoria)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white border-0 outline-none"
                style={{ background: isCritical ? "linear-gradient(135deg,#dc2626,#b91c1c)" : theme.ctaBg }}>
                <IconPlayStat /> Practicar {cat.categoria}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── AIRecomendacionCard ────────────────────────────────────────────────────────
function AIRecomendacionCard({ rec, theme, onIniciar }) {
  const styles = {
    alta:  { bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.28)",   accent:"#ef4444", text:"#fca5a5" },
    media: { bg:theme.primaryGlow,         border:theme.primaryBorder,      accent:theme.primary, text:theme.primaryText },
    baja:  { bg:"rgba(16,185,129,0.07)",  border:"rgba(16,185,129,0.25)",  accent:"#10b981", text:"#6ee7b7" },
  }[rec.urgency] || {};
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.1 }}
      className="rounded-2xl border p-4" style={{ background:styles.bg, borderColor:styles.border }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">💡</span>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color:styles.text }}>Consejo</p>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed mb-3">{rec.text}</p>
      <motion.button whileTap={{ scale:0.97 }} onClick={() => onIniciar(rec.cta)}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white border-0 outline-none w-full"
        style={{ background:`linear-gradient(135deg,${styles.accent}cc,${styles.accent}88)` }}>
        <IconPlayStat />
        {rec.cta === "examen" ? "Simular examen" : "Practicar ahora"}
        <motion.span animate={{ x:[0,3,0] }} transition={{ repeat:Infinity, duration:1.6 }}>→</motion.span>
      </motion.button>
    </motion.div>
  );
}

// ── HistorialEnEstadisticas ────────────────────────────────────────────────────
function HistorialEnEstadisticas({ datos, onAbrirDetalle, loadingDetalle, onEliminar }) {
  const [eliminando, setEliminando] = useState(null);

  const handleEliminar = (id) => {
    setEliminando(id);
    setTimeout(() => onEliminar && onEliminar(id), 320);
  };

  const handleEliminarBtn = (e, id) => {
    e.stopPropagation();
    handleEliminar(id);
  };

  if (!datos?.examenes || datos.examenes.length === 0) return null;

  return (
    <motion.div {...fadeUp(0.3)} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <IconHistory size={14} className="text-slate-400" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Historial de exámenes</p>
      </div>
      <div className="rounded-2xl border border-slate-800/60 overflow-hidden">
        {datos.examenes.map((ex, i) => {
          const ok = ex.puntaje_obtenido >= 33;
          const pct = Math.round((ex.correctas / ex.total) * 100);
          return (
            <SwipeToDelete key={ex.id} onDelete={() => handleEliminar(ex.id)} disabled={loadingDetalle}>
              <div className="border-b border-slate-800/40 last:border-0">
                <div className="flex items-center">
                  <button onClick={() => onAbrirDetalle && onAbrirDetalle(ex)} disabled={loadingDetalle}
                    className="bg-transparent flex items-center gap-3 px-4 py-4 flex-1 min-w-0 text-left transition-colors hover:bg-white/5 outline-none">
                    <div className={`w-1 h-10 rounded-full flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-slate-300 text-sm font-semibold">
                          {new Date(ex.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                        </span>
                        {ex.clase && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${ex.clase === "C" ? "bg-orange-500/20 text-orange-400" : "bg-slate-700/60 text-slate-400"}`}>{ex.clase}</span>
                        )}
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${ex.modo === "estudio" ? "bg-amber-500/20 text-amber-400" : ex.modo === "inteligente" ? "bg-pink-500/20 text-pink-400" : "bg-blue-500/20 text-blue-400"}`}>
                          {ex.modo === "estudio" ? "Estudio" : ex.modo === "inteligente" ? "🧠 Inteligente" : "Examen"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                          <motion.div className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.05 + i * 0.03, duration: 0.5 }} />
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{ex.correctas}/{ex.total}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className={`text-base font-black ${ok ? "text-emerald-400" : "text-red-400"}`}>
                        {ex.puntaje_obtenido}<span className="text-xs font-normal text-slate-600"> pts</span>
                      </span>
                      <span className={`text-xs font-semibold ${ok ? "text-emerald-500/70" : "text-red-500/70"}`}>
                        {ok ? "Aprobado" : "Reprobado"}
                      </span>
                    </div>
                    <span className="text-slate-700 flex-shrink-0 ml-1"><IconArrow size={13} /></span>
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleEliminarBtn(e, ex.id)}
                    className="hidden md:flex flex-shrink-0 w-10 h-10 mr-2 rounded-xl items-center justify-center transition-colors bg-transparent border-0 outline-none"
                    style={{ color: "#64748b" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                    title="Eliminar examen">
                    🗑︎
                  </motion.button>
                </div>
              </div>
            </SwipeToDelete>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── SeccionEstadisticas — Nueva versión Google Finance ────────────────────────
function SeccionEstadisticas({ datos, loading, clase = "B", onIniciar, onAbrirDetalle, loadingDetalle, onEliminar }) {
  const theme      = getThemeStats(clase);
  const [showAll, setShowAll]       = useState(false);
  const [timeRange, setTimeRange]   = useState(30); // días

  // Serie temporal desde historial de exámenes
  const series = buildTimeSeries(datos?.examenes ?? [], timeRange);
  const trend  = calcTrend(series);

  const allCats = datos?.statsCategoria ?? [];

  const weaknesses = allCats
    .filter(c => c.total >= 3)
    .map(c => ({
      ...c,
      errorRate:     1 - c.pct / 100,
      priorityScore: calcPriorityScore(c),
      impact:        estimateImpact(c),
      recentFail:    false,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);

  const currentProb = calcWeightedProb(allCats);
  const rec         = getRecomendacion(weaknesses, currentProb);

  const handlePractice = (categoria) => {
    if (onIniciar) onIniciar("inteligente", clase, categoria);
  };

  return (
    <div className="flex flex-col gap-4 p-5 md:p-8 pb-36 md:pb-10">

      {/* Encabezado */}
      <motion.div {...fadeUp(0.05)}>
        <h2 className="text-white font-black text-xl">Estadísticas</h2>
        <p className="text-slate-500 text-sm mt-0.5">Evolución del rendimiento · priorizado por impacto</p>
      </motion.div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} h={i === 0 ? "h-64" : "h-40"} />)}
        </div>
      ) : allCats.length === 0 && (!datos?.examenes || datos.examenes.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-5xl mb-4">📊</motion.div>
          <p className="text-white font-bold text-lg mb-1">Sin datos aún</p>
          <p className="text-slate-500 text-sm">Completa exámenes para activar el análisis.</p>
        </div>
      ) : (
        <>
          {/* ── 1. Gráfico principal Google Finance ── */}
          <motion.div {...fadeUp(0.1)}>
            <HeroMetric
              prob={currentProb}
              trend={trend}
              timeRange={timeRange}
              onTimeRange={setTimeRange}
              series={series}
              theme={theme}
            />
          </motion.div>

          {/* ── 2. Recomendación IA ── */}
          {rec && (
            <motion.div {...fadeUp(0.15)}>
              <AIRecomendacionCard rec={rec} theme={theme} onIniciar={(modo) => onIniciar && onIniciar(modo, clase)} />
            </motion.div>
          )}

          {/* ── 3. Tabla de puntos débiles estilo cotizaciones ── */}
          {weaknesses.length > 0 && (
            <motion.div {...fadeUp(0.2)}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <IconZap />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  Puntos débiles · prioridad de práctica
                </p>
              </div>
              <WeaknessTable weaknesses={weaknesses} theme={theme} onPractice={handlePractice} />
            </motion.div>
          )}

          {/* ── 4. Todas las categorías (tabla compacta) ── */}
          {allCats.length > 0 && (
            <motion.div {...fadeUp(0.25)}>
              <AllCategoriesTable
                allCats={allCats}
                showAll={showAll}
                onToggle={() => setShowAll(s => !s)}
                theme={theme}
              />
            </motion.div>
          )}

          {/* ── 5. Historial de exámenes ── */}
          <HistorialEnEstadisticas datos={datos} onAbrirDetalle={onAbrirDetalle} loadingDetalle={loadingDetalle} onEliminar={onEliminar} />
        </>
      )}
    </div>
  );
}


// ── Menu Drawer (hamburguesa) ──────────────────────────────────────────────────
function MenuDrawer({ user, onLogout, onLibro, onBanco, onLegal, onClose, clase, onClase }) {
  const [claseOpen, setClaseOpen] = useState(false);
  const clases = [
    { id: "B", emoji: "🚗", label: "Clase B", sub: "Automóvil" },
    { id: "C", emoji: "🏍️", label: "Clase C", sub: "Motocicleta" },
  ];
  const claseActual = clases.find(c => c.id === clase);
  return (
    <motion.div className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        className="relative ml-auto w-72 h-full flex flex-col border-l border-slate-800"
        style={{ background: clase === "C" ? "#120d05" : "#0d1626" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* Logo circular con auto de frente */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", boxShadow: "0 0 0 2px rgba(59,130,246,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="8" rx="2" fill="white" opacity="0.9"/>
                <path d="M5 11l2-5h10l2 5" fill="white" opacity="0.7"/>
                <circle cx="7.5" cy="19.5" r="1.5" fill="#1d4ed8"/>
                <circle cx="16.5" cy="19.5" r="1.5" fill="#1d4ed8"/>
                <rect x="9" y="7" width="6" height="4" rx="1" fill="#bfdbfe" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-base leading-none">Maneja<span className="text-blue-400">App</span></p>
              <p className="text-slate-500 text-xs mt-0.5 truncate max-w-40">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-0 outline-none transition-colors">
            <IconX />
          </button>
        </div>

        {/* Dropdown selector de clase */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">Tipo de licencia</p>
          <div className="relative">
            <button onClick={() => setClaseOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all outline-none"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
              <span className="text-lg">{claseActual?.emoji}</span>
              <div className="flex-1 text-left">
                <p className="text-white text-sm font-bold leading-tight">{claseActual?.label}</p>
                <p className="text-slate-500 text-xs">{claseActual?.sub}</p>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                style={{ transform: claseOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "#64748b" }}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <AnimatePresence>
              {claseOpen && (
                <motion.div initial={{ opacity: 0, y: -6, scaleY: 0.9 }} animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.9 }} transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-10"
                  style={{ background: "#0d1626", borderColor: "rgba(255,255,255,0.1)", transformOrigin: "top" }}>
                  {clases.map(({ id, emoji, label, sub }) => (
                    <button key={id} onClick={() => { onClase(id); setClaseOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-0 outline-none text-left"
                      style={{ background: clase === id ? "rgba(59,130,246,0.12)" : "transparent" }}>
                      <span className="text-lg">{emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: clase === id ? "#93c5fd" : "white" }}>{label}</p>
                        <p className="text-xs text-slate-500">{sub}</p>
                      </div>
                      {clase === id && (
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="h-px bg-slate-800 mx-4 mt-2" />

        {/* XP + Gamificación */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 uppercase tracking-widest">Progreso</p>
            <div className="flex items-center gap-2">
              <StreakDisplay />
              <LivesDisplay size="sm" />
            </div>
          </div>
          <XPBar compact />
        </div>

        <div className="h-px bg-slate-800 mx-4" />

        <div className="flex flex-col gap-1 p-4 flex-1">
          <p className="text-xs text-slate-600 uppercase tracking-widest px-2 mb-2">Recursos</p>
          <button onClick={() => { onBanco(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium bg-transparent border-0 outline-none flex items-center justify-between">
            <span>📚 Banco de Preguntas</span><IconArrow />
          </button>
          <button onClick={() => { onLibro(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium bg-transparent border-0 outline-none flex items-center justify-between">
            <span>📖 Manual del Conductor</span><IconArrow />
          </button>
          {onLegal && (
            <>
              <div className="h-px bg-slate-800 my-3" />
              <p className="text-xs text-slate-600 uppercase tracking-widest px-2 mb-2">Legal</p>
              {["privacidad", "terminos", "contacto"].map(tipo => (
                <button key={tipo} onClick={() => { onLegal(tipo); onClose(); }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-sm capitalize bg-transparent border-0 outline-none">
                  {tipo}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-700/60 hover:border-slate-600 text-slate-400 hover:text-white transition-all text-sm font-semibold bg-transparent outline-none">
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Desktop Sidebar ────────────────────────────────────────────────────────────
function DesktopSidebar({ user, datos, loading, activeSection, onSection, onIniciar, onBanco, onLibro, onLogout, onLegal, clase, onClase, probabilidad }) {
  const [claseOpen, setClaseOpen] = React.useState(false);
  const clases = [
    { id: "B", emoji: "🚗", label: "Clase B", sub: "Automóvil" },
    { id: "C", emoji: "🏍️", label: "Clase C", sub: "Moto" },
  ];
  const claseActual = clases.find(c => c.id === clase);
  // Leer perfil guardado
  const nombreGuardado = localStorage.getItem("perfil_nombre") || user.email.split("@")[0];
  const fotoGuardada   = localStorage.getItem("perfil_foto") || "";
  const inicial        = nombreGuardado[0]?.toUpperCase() ?? "?";

  return (
    <motion.div
      animate={{ borderColor: "rgba(255,255,255,0.06)" }}
      transition={{ duration: 0.5 }}
      className="hidden md:flex w-64 lg:w-72 flex-shrink-0 border-r flex-col h-full overflow-hidden relative z-10"
      style={{ background: "#0a0f1a" }}>

      {/* ── Logo + usuario ──────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-5">
          {/* Logo clickeable → vuelve a inicio */}
          <button onClick={() => onSection("inicio")} className="flex items-center gap-3 flex-1 bg-transparent border-0 p-0 outline-none hover:opacity-80 transition-opacity text-left">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="8" rx="2" fill="#3b82f6" opacity="0.92"/>
                <path d="M5.5 11l2-5h9l2 5" fill="#60a5fa" opacity="0.75"/>
                <circle cx="7.5" cy="19.5" r="1.5" fill="#1e3a8a"/>
                <circle cx="16.5" cy="19.5" r="1.5" fill="#1e3a8a"/>
                <rect x="9" y="7" width="6" height="4" rx="1" fill="#bfdbfe" opacity="0.9"/>
                <rect x="3" y="14" width="3" height="2" rx="0.5" fill="#fcd34d" opacity="0.9"/>
                <rect x="18" y="14" width="3" height="2" rx="0.5" fill="#fcd34d" opacity="0.9"/>
              </svg>
            </div>
            <h1 className="font-black text-white text-lg leading-none tracking-tight flex-1">
              Maneja<span className="text-blue-400">App</span>
            </h1>
          </button>
          <StreakDisplay />
        </div>

        {/* Usuario — clickeable para ir a perfil */}
        <button onClick={() => onSection("perfil")}
          className="flex items-center gap-3 mb-4 px-1 w-full bg-transparent border-0 outline-none text-left hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
            style={{
              background: fotoGuardada ? "transparent" : "linear-gradient(135deg, rgba(99,102,241,0.6), rgba(168,85,247,0.6))",
              border: "2px solid rgba(255,255,255,0.08)",
            }}>
            {fotoGuardada
              ? <img src={fotoGuardada} alt="" className="w-full h-full object-cover" />
              : inicial
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{nombreGuardado}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-slate-700 flex-shrink-0">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown selector de clase */}
        <div className="relative">
          <button onClick={() => setClaseOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all outline-none"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}>
            <span className="text-base">{claseActual?.emoji}</span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-sm font-bold leading-tight">{claseActual?.label}</p>
              <p className="text-slate-500 text-xs">{claseActual?.sub}</p>
            </div>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"
              style={{ transform: claseOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <AnimatePresence>
            {claseOpen && (
              <motion.div initial={{ opacity: 0, y: -6, scaleY: 0.9 }} animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -6, scaleY: 0.9 }} transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden z-20"
                style={{ background: "#0d1626", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", transformOrigin: "top" }}>
                {clases.map(({ id, emoji, label, sub }) => (
                  <button key={id} onClick={() => { onClase(id); setClaseOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 transition-colors border-0 outline-none text-left hover:bg-white/5"
                    style={{ background: clase === id ? "rgba(59,130,246,0.10)" : "transparent" }}>
                    <span className="text-base">{emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: clase === id ? "#93c5fd" : "white" }}>{label}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                    {clase === id && (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="h-px bg-slate-800/60 mx-4 flex-shrink-0" />

      {/* ── Nav principal ────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-3 py-3 flex-shrink-0">
        {[
          { id: "inicio",       icon: IconHome,    label: "Inicio" },
          { id: "estadisticas", icon: IconChart,    label: "Estadísticas" },
        ].map(({ id, icon: Icon, label }) => {
          const isActive = activeSection === id;
          return (
            <button key={id} onClick={() => onSection(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-transparent border-0 outline-none text-left"
              style={isActive
                ? { background: "rgba(59,130,246,0.14)", color: "white" }
                : { color: "#64748b" }}>
              <Icon size={17} style={{ color: isActive ? "#60a5fa" : "#475569" }} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-slate-800/60 mx-4 flex-shrink-0" />

      {/* ── XP + Vidas ───────────────────────────────────────────── */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold">Gamificación</p>
          <LivesDisplay size="sm" />
        </div>
        <XPBar compact />
      </div>

      <div className="h-px bg-slate-800/60 mx-4 flex-shrink-0" />

      {/* ── Modos de práctica ────────────────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-0.5 flex-shrink-0">
        <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-1.5 px-2">Practicar</p>
        {[
          { label: "Modo Examen",      emoji: "📋", onClick: () => onIniciar("examen") },
          { label: "Modo Estudio",     emoji: "💡", onClick: () => onIniciar("estudio") },
          { label: "Modo Inteligente", emoji: "🧠", onClick: () => onIniciar("inteligente") },
        ].map(({ label, emoji, onClick }) => (
          <button key={label} onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-transparent border-0 outline-none text-left text-slate-400 hover:text-white hover:bg-white/5">
            <span className="text-base">{emoji}</span>
            <span className="flex-1">{label}</span>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" opacity="0.35"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ))}
      </div>

      <div className="h-px bg-slate-800/60 mx-4 flex-shrink-0" />

      {/* ── Recursos ─────────────────────────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-0.5 flex-shrink-0">
        <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-1.5 px-2">Recursos</p>
        <button onClick={onBanco}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-transparent border-0 outline-none text-left text-slate-400 hover:text-white hover:bg-white/5">
          <span className="text-base">📚</span><span className="flex-1 truncate">Banco de Pregun...</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" opacity="0.35"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={onLibro}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-transparent border-0 outline-none text-left text-slate-400 hover:text-white hover:bg-white/5">
          <span className="text-base">📖</span><span className="flex-1 truncate">Manual del Condu...</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" opacity="0.35"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* ── Spacer + logout ──────────────────────────────────────── */}
      <div className="flex-1" />
      <div className="p-4 border-t border-slate-800/60 flex-shrink-0">
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all text-xs font-semibold bg-transparent border-0 outline-none">
          <IconLogout /> Cerrar sesión
        </button>
        {onLegal && (
          <div className="flex items-center justify-center gap-3 mt-2">
            {["privacidad", "terminos", "contacto"].map((tipo, i) => (
              <span key={tipo} className="flex items-center gap-3">
                <button onClick={() => onLegal(tipo)} className="text-xs text-slate-800 hover:text-slate-500 transition-colors bg-transparent border-0 outline-none p-0 capitalize">{tipo}</button>
                {i < 2 && <span className="text-slate-800 text-xs">·</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
// ── Bottom Nav (móvil) ─────────────────────────────────────────────────────────
function BottomNav({ activeSection, onSection, onMenuOpen, clase, foto, nombre }) {
  const inicial = nombre?.[0]?.toUpperCase() ?? "?";
  const tabs = [
    { id: "inicio",       icon: IconHome,  label: "Inicio" },
    { id: "estadisticas", icon: IconChart, label: "Stats" },
    { id: "practicar",    icon: IconPlay,  label: "Practicar" },
    { id: "mas",          icon: null,      label: "Más" },
  ];
  const accentColor = clase === "C" ? "text-amber-400" : "text-blue-400";
  const accentBg    = clase === "C" ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.07)";
  const isActive = (id) => id === "mas" ? false : activeSection === id;
  return (
    <motion.div
      animate={{ borderColor: clase === "C" ? "rgba(217,119,6,0.2)" : "rgba(30,41,59,0.8)" }}
      transition={{ duration: 0.5 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: clase === "C" ? "rgba(18,13,4,0.98)" : "rgba(10,15,26,0.97)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-center px-2 py-2">
        {tabs.map(({ id, icon: Icon, label }) => {
          const active = isActive(id);
          if (id === "mas") {
            return (
              <button key={id} onClick={onMenuOpen}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all bg-transparent border-0 outline-none relative">
                {/* Avatar o icono hamburguesa */}
                {foto ? (
                  <img src={foto} alt="perfil" className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-600" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 text-xs font-black"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {inicial}
                  </div>
                )}
                <span className="text-[11px] font-semibold leading-none text-slate-600">{label}</span>
              </button>
            );
          }
          return (
            <button key={id} onClick={() => onSection(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all bg-transparent border-0 outline-none relative">
              {active && (
                <motion.div layoutId="bnav-bg" className="absolute inset-1 rounded-xl"
                  style={{ background: accentBg }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }} />
              )}
              <Icon size={22} className={`relative z-10 transition-colors ${active ? accentColor : "text-slate-500"}`} />
              <span className={`relative z-10 text-[11px] font-semibold transition-colors leading-none ${active ? accentColor : "text-slate-600"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Mobile Top Bar ─────────────────────────────────────────────────────────────
function MobileTopBar({ activeSection, clase, onSection, onMenuOpen }) {
  const titles = { inicio: "Inicio", estadisticas: "Estadísticas", practicar: "Practicar", perfil: "Perfil" };
  return (
    <div className="md:hidden flex items-center px-4 py-3.5 border-b flex-shrink-0"
      style={{
        background: clase === "C" ? "rgba(18,13,4,0.98)" : "rgba(10,15,26,0.95)",
        borderColor: clase === "C" ? "rgba(217,119,6,0.2)" : "rgba(30,41,59,0.8)",
        backdropFilter: "blur(12px)"
      }}>
      {/* Logo clickeable → vuelve a inicio */}
      <button
        onClick={() => onSection("inicio")}
        className="flex items-center gap-2 bg-transparent border-0 p-0 outline-none hover:opacity-80 transition-opacity flex-shrink-0">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="8" rx="2" fill="#3b82f6" opacity="0.92"/>
            <path d="M5.5 11l2-5h9l2 5" fill="#60a5fa" opacity="0.75"/>
            <circle cx="7.5" cy="19.5" r="1.5" fill="#1e3a8a"/>
            <circle cx="16.5" cy="19.5" r="1.5" fill="#1e3a8a"/>
            <rect x="9" y="7" width="6" height="4" rx="1" fill="#bfdbfe" opacity="0.9"/>
            <rect x="3" y="14" width="3" height="2" rx="0.5" fill="#fcd34d" opacity="0.85"/>
            <rect x="18" y="14" width="3" height="2" rx="0.5" fill="#fcd34d" opacity="0.85"/>
          </svg>
        </div>
        <span className="font-black text-white text-sm">Maneja<span className="text-blue-400">App</span></span>
      </button>
      <div className="w-px h-3.5 bg-slate-700 mx-3" />
      <AnimatePresence mode="wait">
        <motion.span key={activeSection}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="text-slate-300 font-semibold text-sm">
          {titles[activeSection]}
        </motion.span>
      </AnimatePresence>
      <div className="ml-auto flex items-center gap-3">
        <StreakDisplay />
        <LivesDisplay size="sm" />
      </div>
    </div>
  );
}

// ── Modal Practicar ────────────────────────────────────────────────────────────
function ModalPracticar({ onIniciar, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
        className="relative w-full rounded-t-3xl border-t border-slate-700/60 p-5 pb-10 cursor-grab active:cursor-grabbing"
        style={{ background: "#0d1626" }}>
        <div className="w-12 h-1.5 rounded-full bg-slate-600 mx-auto mb-5 mt-1" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-black text-lg">Elegir modo</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white border-0 outline-none transition-colors">
            <IconX size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "📋 Modo Examen", sub: "Sin retroalimentación · Idéntico al real", modo: "examen", cls: "border-blue-500/40", bg: "rgba(59,130,246,0.08)" },
            { label: "💡 Modo Estudio", sub: "Explicaciones inmediatas en cada pregunta", modo: "estudio", cls: "border-amber-500/40", bg: "rgba(245,158,11,0.08)" },
            { label: "🧠 Modo Inteligente", sub: "Repasa solo tus preguntas débiles con explicaciones", modo: "inteligente", cls: "border-pink-500/40", bg: "rgba(236,72,153,0.08)" },
          ]
          /* orden: examen → estudio → inteligente */.map(({ label, sub, modo, cls, bg }) => {
            const isInteligente = modo === "inteligente";
            const canUseInt = useGameStore.getState().canUseInteligente();
            const locked = isInteligente && !canUseInt;
            return (
            <motion.button key={modo} whileTap={{ scale: 0.98 }} onClick={() => { if (locked) { onClose(); window.__showInteligenteModal?.(); return; } onIniciar(modo); onClose(); }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all outline-none flex items-center justify-between ${cls}`}
              style={{ background: bg }}>
              <div>
                <p className="text-white font-bold text-sm">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
              <IconArrow />
            </motion.button>
          );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── IconUser ───────────────────────────────────────────────────────────────────
const IconUser = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── SeccionPerfil ──────────────────────────────────────────────────────────────
function SeccionPerfil({ user, onLogout }) {
  const [nombre, setNombre]       = useState(() => localStorage.getItem("perfil_nombre") || user.email.split("@")[0]);
  const [sexo, setSexo]           = useState(() => localStorage.getItem("perfil_sexo") || "");
  const [foto, setFoto]           = useState(() => localStorage.getItem("perfil_foto") || "");
  const [guardado, setGuardado]   = useState(false);
  const [editando, setEditando]   = useState(false);
  const fileRef = React.useRef(null);

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGuardar = () => {
    localStorage.setItem("perfil_nombre", nombre);
    localStorage.setItem("perfil_sexo", sexo);
    if (foto) localStorage.setItem("perfil_foto", foto);
    setGuardado(true);
    setEditando(false);
    setTimeout(() => setGuardado(false), 2500);
  };

  const handleEliminarFoto = () => {
    setFoto("");
    localStorage.removeItem("perfil_foto");
  };

  const inicial = nombre?.[0]?.toUpperCase() ?? "?";

  const sexoOpciones = [
    { id: "masculino", label: "Masculino",  emoji: "👨" },
    { id: "femenino",  label: "Femenino",   emoji: "👩" },
    { id: "otro",      label: "Prefiero no indicar", emoji: "🙂" },
  ];

  return (
    <div className="flex flex-col gap-5 p-5 md:p-8 pb-28 md:pb-8 max-w-lg mx-auto w-full">
      <motion.div {...fadeUp(0.05)}>
        <h2 className="text-white font-black text-xl">Perfil</h2>
        <p className="text-slate-500 text-sm mt-0.5">Personaliza tu cuenta</p>
      </motion.div>

      {/* ── Avatar ── */}
      <motion.div {...fadeUp(0.1)} className="flex flex-col items-center gap-4 py-2">
        <div className="relative">
          {/* Foto o inicial */}
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{
              background: foto ? "transparent" : "linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7))",
              border: "3px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.04)",
            }}>
            {foto
              ? <img src={foto} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white text-3xl font-black">{inicial}</span>
            }
          </div>
          {/* Botón editar foto */}
          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-900 bg-blue-500 hover:bg-blue-400 transition-colors outline-none"
            title="Cambiar foto">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M15 3l6 6L7 21H3v-4L15 3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
        </div>

        {foto && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={handleEliminarFoto}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors bg-transparent border-0 outline-none">
            Eliminar foto
          </motion.button>
        )}
      </motion.div>

      {/* ── Campos ── */}
      <motion.div {...fadeUp(0.15)} className="flex flex-col gap-3">

        {/* Nombre */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Nombre</p>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setEditando(true); }}
              maxLength={30}
              placeholder="Tu nombre"
              className="w-full bg-transparent text-white text-base font-semibold outline-none border-0 pb-3"
              style={{ caretColor: "#3b82f6" }}
            />
          </div>
          <div className="h-px mx-4" style={{ background: editando ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.06)" }} />
          <div className="px-4 py-2 flex justify-between items-center">
            <span className="text-xs text-slate-600">{nombre.length}/30 caracteres</span>
          </div>
        </div>

        {/* Sexo */}
        <div className="rounded-2xl border p-4"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Sexo</p>
          <div className="flex flex-col gap-2">
            {sexoOpciones.map(op => (
              <motion.button key={op.id} whileTap={{ scale: 0.98 }}
                onClick={() => { setSexo(op.id); setEditando(true); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-0 outline-none text-left transition-all"
                style={{
                  background: sexo === op.id ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${sexo === op.id ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.06)"}`,
                }}>
                <span className="text-lg">{op.emoji}</span>
                <span className="text-sm font-semibold flex-1"
                  style={{ color: sexo === op.id ? "#93c5fd" : "#cbd5e1" }}>
                  {op.label}
                </span>
                {sexo === op.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.25)" }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Email (solo lectura) */}
        <div className="rounded-2xl border px-4 py-3.5 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" className="text-slate-600 flex-shrink-0">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-600 mb-0.5">Correo electrónico</p>
            <p className="text-slate-400 text-sm truncate">{user.email}</p>
          </div>
          <span className="text-xs text-slate-700 flex-shrink-0 font-medium">Solo lectura</span>
        </div>
      </motion.div>

      {/* ── Botón guardar ── */}
      <motion.div {...fadeUp(0.2)}>
        <AnimatePresence mode="wait">
          {guardado ? (
            <motion.div key="ok"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Cambios guardados
            </motion.div>
          ) : (
            <motion.button key="save" whileTap={{ scale: 0.98 }} whileHover={{ filter: "brightness(1.08)" }}
              onClick={handleGuardar}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white border-0 outline-none"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}>
              Guardar cambios
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Cerrar sesión ── */}
      <motion.div {...fadeUp(0.25)}>
        <div className="h-px mb-5" style={{ background: "rgba(255,255,255,0.05)" }} />
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all text-sm font-semibold bg-transparent outline-none"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <IconLogout size={15} /> Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}

// ── Dashboard Principal ────────────────────────────────────────────────────────
export function Dashboard({ user, onIniciar, onLogout, onBanco, onLibro, onLegal, onClaseChange, initialClase, refreshKey }) {
  // Expose inteligente modal trigger for ModalPracticar lock
  const [showInteligenteModal, setShowInteligenteModal] = React.useState(false);
  React.useEffect(() => {
    window.__showInteligenteModal = () => setShowInteligenteModal(true);
    return () => { delete window.__showInteligenteModal; };
  }, []);
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [examenDetalle, setExamenDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [practicarOpen, setPracticarOpen] = useState(false);
  const [adaptativo, setAdaptativo] = useState(null);
  const [probabilidad, setProbabilidad] = useState(null);
  const [tresHitos, setTresHitos] = useState(null);
  const [clase, setClase] = useState(initialClase || "B");
  const handleClase = (c) => { setClase(c); if (onClaseChange) onClaseChange(c); };

  // Sync clase if initialClase changes (e.g. returning from a mode)
  React.useEffect(() => {
    if (initialClase && initialClase !== clase) {
      setClase(initialClase);
    }
  }, [initialClase]);

  const claseRef = useRef(clase);

  useEffect(() => {
    claseRef.current = clase;
    let cancelled = false;

    setLoading(true);
    setProbabilidad(null);
    setAdaptativo(null);
    setTresHitos(null);
    setDatos(null);

    obtenerDashboard(user.id, clase)
      .then(d => { if (!cancelled && claseRef.current === clase) setDatos(d); })
      .finally(() => { if (!cancelled && claseRef.current === clase) setLoading(false); });

    obtenerResumenAdaptativo(user.id, clase)
      .then(d => { if (!cancelled && claseRef.current === clase) setAdaptativo(d); })
      .catch(() => { if (!cancelled && claseRef.current === clase) setAdaptativo(null); });

    calcularProbabilidadAprobar(user.id, clase)
      .then(p => {
        if (!cancelled && claseRef.current === clase) setProbabilidad(p ?? null);
      })
      .catch(() => { if (!cancelled && claseRef.current === clase) setProbabilidad(null); });

    obtenerTresHitos(user.id, clase)
      .then(h => { if (!cancelled && claseRef.current === clase) setTresHitos(h); })
      .catch(() => { if (!cancelled && claseRef.current === clase) setTresHitos(null); });

    return () => { cancelled = true; };
  }, [user.id, clase, refreshKey]);

  const abrirDetalle = async (examen) => {
    setLoadingDetalle(true);
    try {
      const respuestas = await obtenerDetalleExamen(examen.id);
      setExamenDetalle({ examen, respuestas });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminarExamen(id);
      const examenesRestantes = datos.examenes.filter(e => e.id !== id);
      setDatos(prev => ({ ...prev, examenes: examenesRestantes }));
      if (examenesRestantes.length === 0) {
        await limpiarStats(user.id);
        setAdaptativo(null);
        setProbabilidad(null);
        setTresHitos(null);
      } else {
        obtenerResumenAdaptativo(user.id, clase).then(setAdaptativo).catch(() => {});
        calcularProbabilidadAprobar(user.id, clase).then(p => setProbabilidad(p ?? null)).catch(() => setProbabilidad(null));
        obtenerTresHitos(user.id, clase).then(setTresHitos).catch(() => {});
      }
    } catch (err) {
      console.error("Error eliminando examen:", err);
    }
  };

  const handleSection = (id) => {
    if (id === "practicar") { setPracticarOpen(true); return; }
    setActiveSection(id);
  };

  // Leer perfil del localStorage para pasarlo a BottomNav
  const perfilFoto   = localStorage.getItem("perfil_foto") || "";
  const perfilNombre = localStorage.getItem("perfil_nombre") || user.email.split("@")[0];

  if (examenDetalle) {
    return <DetalleExamen examen={examenDetalle.examen} respuestas={examenDetalle.respuestas} onVolver={() => setExamenDetalle(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full overflow-hidden flex relative">
      {/* Fondo dinámico según clase */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{
          background: clase === "C"
            ? "radial-gradient(ellipse at 0% 100%, rgba(100,45,0,0.10) 0%, transparent 35%)"
            : "radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.10) 0%, transparent 55%), radial-gradient(ellipse at 85% 10%, rgba(29,78,216,0.07) 0%, transparent 90%)"
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      <DesktopSidebar
        user={user} datos={datos} loading={loading}
        activeSection={activeSection} onSection={setActiveSection}
        onIniciar={(modo) => onIniciar(modo, clase)} onBanco={() => onBanco(clase)} onLibro={onLibro}
        onLogout={onLogout} onLegal={onLegal}
        clase={clase} onClase={handleClase}
        probabilidad={probabilidad}
      />
      <motion.div
        animate={{ background: clase === "C" ? "#0f0b08" : "#0a0f1a" }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar activeSection={activeSection} clase={clase} onSection={setActiveSection} onMenuOpen={() => setMenuOpen(true)} />
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 overflow-y-auto">
              {activeSection === "inicio" && (
                <SeccionInicio user={user} datos={datos} loading={loading} onIniciar={(modo, cl, cat) => onIniciar(modo, cl || clase, cat)} onBanco={() => onBanco(clase)} onAbrirDetalle={abrirDetalle} loadingDetalle={loadingDetalle} onEliminar={handleEliminar} adaptativo={adaptativo} probabilidad={probabilidad} clase={clase} tresHitos={tresHitos} />
              )}
              {activeSection === "historial" && (
                <SeccionHistorial datos={datos} loading={loading} onAbrirDetalle={abrirDetalle} loadingDetalle={loadingDetalle} onEliminar={handleEliminar} />
              )}
              {activeSection === "estadisticas" && (
                <SeccionEstadisticas datos={datos} loading={loading} clase={clase} onIniciar={(modo, cl) => onIniciar(modo, cl || clase)} onAbrirDetalle={abrirDetalle} loadingDetalle={loadingDetalle} onEliminar={handleEliminar} />
              )}
              {activeSection === "perfil" && (
                <SeccionPerfil user={user} onLogout={onLogout} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      <BottomNav activeSection={activeSection} onSection={handleSection} onMenuOpen={() => setMenuOpen(true)} clase={clase} foto={perfilFoto} nombre={perfilNombre} />
      <AnimatePresence>
        {menuOpen && (
          <MenuDrawer user={user} onLogout={onLogout} onLibro={onLibro} onBanco={() => onBanco(clase)} onLegal={onLegal} onClose={() => setMenuOpen(false)} clase={clase} onClase={handleClase} />
        )}
        {practicarOpen && (
          <ModalPracticar onIniciar={(modo) => onIniciar(modo, clase)} onClose={() => setPracticarOpen(false)} />
        )}
        {showInteligenteModal && (
          <InteligenteLockedModal
            onClose={() => setShowInteligenteModal(false)}
            onPremium={() => { setShowInteligenteModal(false); useGameStore.getState().setIsPremium(true); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}