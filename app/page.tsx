"use client";

import { createContext, useCallback, useContext, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, CircleArrowRight, Pencil, Plus, Trash2, X, Brain, Sparkles, Scissors, Box, Eye, Play, LogOut, Upload, Loader2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Lenis from "lenis";
import { defaultContent, languageKey, Lang, SiteContent, storageKey, Collaborator, WorkItem } from "@/lib/content";

const ease = [0.22, 1, 0.36, 1] as const;

// ---- Inline edit framework -------------------------------------------------
type SyncState = "idle" | "saving" | "error";
type EditAPI = {
  editMode: boolean;
  setEditMode: (b: boolean) => void;
  setContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  update: (path: string, value: unknown) => void;
  upload: (file: File) => Promise<string>;
  sync: SyncState;
};
const EditContext = createContext<EditAPI | null>(null);
function useEdit() { return useContext(EditContext); }

// Admin gate: only a SHA-256 hash of the password is ever shipped to the client,
// so the plaintext password is never present in the bundle or the git history.
// Default hash = sha256("alex-creates-2026"); override with NEXT_PUBLIC_ADMIN_PASSWORD_HASH.
const adminPasswordHash = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH || "3c3c5ab0d3845da5a62bbae1a986954d781bdd94feff639229471396f2c08ca7";
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
// Social contact links — edit handles here.
const telegramUrl = "https://t.me/alexcreates";
const telegramHandle = "@alexcreates";
const instagramUrl = "https://instagram.com/alex.creates";
const instagramHandle = "@alex.creates";

// Brand glyphs (lucide dropped brand icons, so inline them).
function TelegramIcon({ className = "h-6 w-6" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>;
}
function InstagramIcon({ className = "h-6 w-6" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.4" /><circle cx="12" cy="12" r="4" /><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" /></svg>;
}

function t<T extends string | string[]>(value: Record<Lang, T>, lang: Lang): T { return value[lang] ?? value.en; }
function uid(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 8)}`; }

// Smooth inertial scroll (Lenis). Disabled under reduced-motion; routes anchor
// clicks through lenis.scrollTo so in-page nav stays smooth.
function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.1, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
    let raf = 0;
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      const id = link?.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement);
    };
    document.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("click", onClick); lenis.destroy(); };
  }, [reduce]);
}

// Content is served by the local backend (data/content.json via /api/content) and
// is the source of truth for every visitor. Edits PUT back to the server (debounced)
// and the sync state drives the admin-bar dot. Falls back to a localStorage cache /
// the bundled defaults when the API is unavailable (e.g. static export build).
function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNext = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content").then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: SiteContent) => { if (!cancelled) setContent(d); })
      .catch(() => { try { const c = localStorage.getItem(storageKey); if (c && !cancelled) setContent(JSON.parse(c)); } catch {} })
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNext.current) { skipNext.current = false; return; }
    try { localStorage.setItem(storageKey, JSON.stringify(content)); } catch {}
    setSync("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
        if (!res.ok) throw new Error();
        setSync("idle");
      } catch { setSync("error"); }
    }, 600);
  }, [content, hydrated]);

  return { content, setContent, hydrated, sync, setSync };
}

function useLanguage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(languageKey);
    if (saved === "ru" || saved === "en") { setLang(saved); document.documentElement.lang = saved; }
  }, []);
  const update = (next: Lang) => { setLang(next); localStorage.setItem(languageKey, next); document.documentElement.lang = next; };
  return [lang, update] as const;
}

export function WordsPullUp({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(/\s+/);
  return <span className={className} aria-label={text}>{words.map((word, i) => <motion.span key={`${word}-${i}`} aria-hidden="true" className="inline-block overflow-hidden align-bottom pr-[.2em]"><motion.span className="inline-block" initial={reduce ? false : { y: "110%", opacity: 0 }} whileInView={reduce ? {} : { y: 0, opacity: 1 }} viewport={{ once: true, amount: .7 }} transition={{ duration: .72, delay: delay + i * .035, ease }}>{word}</motion.span></motion.span>)}</span>;
}

export function WordsPullUpMultiStyle({ segments, className = "" }: { segments: { text: string; className?: string }[]; className?: string }) {
  let count = 0;
  return <span className={className}>{segments.map((seg, sIdx) => { const start = count; count += seg.text.split(/\s+/).length; return <WordsPullUp key={sIdx} text={seg.text} className={seg.className} delay={start * .035} />; })}</span>;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 34, filter: "blur(14px)" }} whileInView={reduce ? {} : { opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, amount: .18, margin: "0px 0px -80px 0px" }} transition={{ duration: .8, delay, ease }}>{children}</motion.div>;
}

function WordOpacity({ text }: { text: string }) {
  const words = text.split(/\s+/);
  return <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-[rgba(225,224,204,.45)] md:text-base">{words.map((w, i) => <motion.span key={`${w}-${i}`} className="inline-block pr-[.28em]" initial={{ opacity: .22 }} whileInView={{ opacity: .82 }} viewport={{ once: true, amount: .65 }} transition={{ delay: i * .012, duration: .35 }}>{w}</motion.span>)}</p>;
}

const iconMap = {
  ae: <span className="flex gap-1"><span className="rounded-md bg-[#3131a8] px-2 py-1 text-lg font-bold text-[#bbb7ff]">Ae</span><span className="rounded-md bg-[#5f2fb0] px-2 py-1 text-lg font-bold text-[#e5c6ff]">Pr</span></span>,
  blend: <Box className="h-11 w-11 text-[#e68a34]" />,
  brain: <Brain className="h-11 w-11 text-[#7dd9d0]" />,
  spark: <Sparkles className="h-11 w-11 text-[#e1e0cc]" />,
  cut: <Scissors className="h-11 w-11 text-[#d89b57]" />,
};

function VideoOrImage({ src, poster, type = "video", className = "", auto = true }: { src: string; poster?: string; type?: "video" | "image"; className?: string; auto?: boolean }) {
  if (type === "image") return <img src={src || poster} alt="Cinematic media" className={`h-full w-full object-cover ${className}`} />;
  return <video className={`h-full w-full object-cover ${className}`} src={src} poster={poster} autoPlay={auto} muted loop playsInline preload="metadata" />;
}

// Seamless looping video with a dissolve at the loop seam. The incoming layer
// is brought on top and faded 0->1 while the outgoing layer stays fully opaque
// underneath — so the composite brightness never dips (a symmetric crossfade
// where both layers go through 50% darkens against the background). The incoming
// layer starts OFFSET seconds in so the static intro frame never shows mid-fade.
const HERO_CROSSFADE = 1; // dissolve length, seconds
const HERO_OFFSET = 1;    // skip this much of the start on every loop after the first
function HeroVideo({ src, poster, className = "" }: { src: string; poster?: string; className?: string }) {
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const a = aRef.current, b = bRef.current;
    if (!a || !b) return;
    a.style.opacity = "1"; a.style.zIndex = "1";
    b.style.opacity = "0"; b.style.zIndex = "2";
    a.currentTime = 0;
    a.play().catch(() => {});
    if (reduce) return;

    let raf = 0;
    let fading = false;
    let activeIsA = true;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const active = activeIsA ? a : b;
      const incoming = activeIsA ? b : a;
      if (!active.duration || Number.isNaN(active.duration)) return;
      if (!fading && active.currentTime >= active.duration - HERO_CROSSFADE) {
        fading = true;
        // Bring the incoming layer on top, snap it transparent (no animated
        // fade-out of the old frame), prime it, then fade it in over the
        // still-opaque outgoing layer.
        incoming.style.zIndex = "2";
        active.style.zIndex = "1";
        incoming.style.transition = "none";
        incoming.style.opacity = "0";
        incoming.currentTime = HERO_OFFSET;
        incoming.play().catch(() => {});
        void incoming.offsetWidth; // force reflow so the snap-to-0 applies before the fade
        incoming.style.transition = `opacity ${HERO_CROSSFADE}s linear`;
        incoming.style.opacity = "1";
        window.setTimeout(() => { active.pause(); activeIsA = !activeIsA; fading = false; }, HERO_CROSSFADE * 1000);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const base = "absolute inset-0 h-full w-full object-cover";
  return <div className={`absolute inset-0 ${className}`}>
    <video ref={aRef} src={src} poster={poster} muted playsInline preload="auto" className={base} />
    <video ref={bRef} src={src} poster={poster} muted playsInline preload="auto" className={base} />
  </div>;
}

// ---- Reusable editor UI ----------------------------------------------------
function EditButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }} title="Edit"
    className={`grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/65 text-[#e8e7d5] shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-[#d89b57]/70 hover:text-white active:scale-95 ${className}`}>
    <Pencil className="h-4 w-4" />
  </button>;
}

function EField({ label, value, onChange, textarea = false, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string }) {
  const cls = "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[#e1e0cc] outline-none transition focus:border-[#d89b57]/50 focus:shadow-[0_0_0_3px_rgba(216,155,87,0.12)]";
  return <label className="mb-3 block text-xs text-[#e1e0cc]/60">{label}
    {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className={cls} />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
  </label>;
}

// Drag-drop / click / paste-URL media uploader. Real upload goes to /api/upload.
// `ratio` keeps the preview in the same shape as the page (e.g. 9:16 for vertical
// videos); `round` renders a circular avatar dropzone.
function MediaDrop({ label, value, kind, onChange, ratio = "aspect-video", round = false }: { label: string; value: string; kind: "image" | "video"; onChange: (url: string) => void; ratio?: string; round?: boolean }) {
  const edit = useEdit();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement | null>(null);
  async function handle(file?: File | null) {
    if (!file || !edit) return;
    setBusy(true); setErr("");
    try { onChange(await edit.upload(file)); } catch { setErr("Upload failed"); } finally { setBusy(false); }
  }
  const box = round ? "mx-auto h-24 w-24 rounded-full" : `w-full ${ratio} rounded-xl`;
  return <div className="mb-3">
    <p className="mb-1.5 text-xs text-[#e1e0cc]/60">{label}</p>
    <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handle(e.dataTransfer.files?.[0]); }} onClick={() => ref.current?.click()}
      className={`relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed border-white/20 bg-black/40 transition hover:border-[#d89b57]/50 ${box}`}>
      {value ? (kind === "video"
        ? <video src={value} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover opacity-70" />
        : <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />) : null}
      <div className={`relative z-10 flex flex-col items-center gap-1 rounded-lg bg-black/55 text-center text-[#e1e0cc]/85 backdrop-blur ${round ? "px-1.5 py-1 text-[9px]" : "px-3 py-2 text-xs"}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className={round ? "h-3 w-3" : "h-4 w-4"} />}
        <span>{busy ? "Uploading…" : round ? "Photo" : "Drop file or click"}</span>
      </div>
      <input ref={ref} type="file" accept={kind === "video" ? "video/*" : "image/*"} className="hidden" onChange={e => handle(e.target.files?.[0])} />
    </div>
    {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    <input value={value} onChange={e => onChange(e.target.value)} placeholder="or paste URL" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-[#e1e0cc]" />
  </div>;
}

function LinksEditor({ links, onChange }: { links: { label: string; url: string }[]; onChange: (l: { label: string; url: string }[]) => void }) {
  return <div className="mb-3">
    <p className="mb-1.5 text-xs text-[#e1e0cc]/60">Buttons (name + link)</p>
    {links.map((l, i) => <div key={i} className="mb-1.5 flex gap-1.5">
      <input value={l.label} onChange={e => onChange(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Instagram" className="w-1/3 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-[#e1e0cc]" />
      <input value={l.url} onChange={e => onChange(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-[#e1e0cc]" />
      <button onClick={() => onChange(links.filter((_, j) => j !== i))} className="rounded-lg bg-white/10 px-2 hover:bg-white/20"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>)}
    <button onClick={() => onChange([...links, { label: "", url: "" }])} className="mt-1 inline-flex items-center gap-1 text-xs text-[#d89b57] hover:text-[#e9b878]"><Plus className="h-3.5 w-3.5" />Add button</button>
  </div>;
}

// Popover shell — parent wraps this in <AnimatePresence> and renders when open.
function EditShell({ title, onClose, onDelete, children, wide = false }: { title: string; onClose: () => void; onDelete?: () => void; children: React.ReactNode; wide?: boolean }) {
  return <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div onClick={e => e.stopPropagation()} className={`panel max-h-[88vh] w-full overflow-auto rounded-[1.4rem] p-5 ${wide ? "max-w-3xl" : "max-w-md"}`} initial={{ y: 20, scale: .97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, scale: .98, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">{title}</h3><button onClick={onClose} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"><X className="h-4 w-4" /></button></div>
      {children}
      {onDelete && <button onClick={onDelete} className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/25"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
    </motion.div>
  </motion.div>;
}

function AddTile({ onClick, label, className = "" }: { onClick: () => void; label: string; className?: string }) {
  return <button onClick={onClick} className={`grid w-full place-items-center rounded-[1.3rem] border border-dashed border-white/20 bg-white/[.02] text-[#e1e0cc]/60 transition hover:border-[#d89b57]/50 hover:text-white ${className}`}>
    <span className="flex flex-col items-center gap-2 py-8 text-sm"><span className="grid h-10 w-10 place-items-center rounded-full border border-white/20"><Plus className="h-5 w-5" /></span>{label}</span>
  </button>;
}

// Drag-to-reorder wrapper (dnd-kit). Listeners on the whole tile; activation
// distance lets inner buttons still be clicked.
function SortableItem({ id, children, className = "", style: styleProp }: { id: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { ...styleProp, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .55 : 1, zIndex: isDragging ? 30 : undefined };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`touch-none ${className}`}>{children}</div>;
}

function AdminBar() {
  const edit = useEdit();
  if (!edit?.editMode) return null;
  const dot = edit.sync === "saving" ? "bg-yellow-400 animate-pulse" : edit.sync === "error" ? "bg-red-500" : "bg-green-500";
  const label = edit.sync === "saving" ? "Saving…" : edit.sync === "error" ? "Sync error" : "All saved";
  return <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-4 right-4 z-[95] flex items-center gap-3 rounded-full border border-white/15 bg-black/75 px-4 py-2.5 text-sm shadow-2xl backdrop-blur-xl">
    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} title={label} />
    <span className="font-medium text-[#e8e7d5]">admin mode</span>
    <span className="h-4 w-px bg-white/20" />
    <button onClick={() => edit.setEditMode(false)} className="inline-flex items-center gap-1.5 text-[#e1e0cc]/70 transition hover:text-white"><LogOut className="h-4 w-4" />logout</button>
  </motion.div>;
}

// Header items in document order, each linking to the right section.
const NAV = [
  { href: "#tools", en: "Programs", ru: "Программы" },
  { href: "#work", en: "My work", ru: "Работы" },
  { href: "#collaborators", en: "Collaborators", ru: "Команда" },
  { href: "#contact", en: "Inquiries", ru: "Заявки" },
];

// Pinned glass header: stays at the top of the viewport on scroll. Sits over the
// hero transparently and condenses into a more solid pill once the page scrolls.
function Header({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <motion.header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-4 sm:pt-5" initial={{ y: -32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .8, delay: .2, ease }}>
    <nav className={`flex w-[calc(100%-12px)] max-w-3xl flex-wrap items-center justify-center gap-1 rounded-full border p-1.5 text-[13px] shadow-2xl backdrop-blur-xl transition-colors duration-500 sm:w-auto sm:flex-nowrap ${scrolled ? "border-white/10 bg-black/72" : "border-white/10 bg-black/40"}`}>
      {NAV.map(n => <a key={n.href} href={n.href} className="rounded-full px-4 py-2.5 text-[#e1e0cc]/80 transition hover:bg-white/10 hover:text-white">{lang === "ru" ? n.ru : n.en}</a>)}
      <span className="mx-1.5 hidden h-6 w-px bg-white/15 sm:block" />
      <button onClick={() => setLang("ru")} className={`rounded-full px-3.5 py-2.5 font-medium transition active:scale-[0.98] ${lang === "ru" ? "bg-[#e1e0cc] text-black" : "text-[#e1e0cc]/65 hover:bg-white/10"}`}>RU</button>
      <button onClick={() => setLang("en")} className={`rounded-full px-3.5 py-2.5 font-medium transition active:scale-[0.98] ${lang === "en" ? "bg-[#e1e0cc] text-black" : "text-[#e1e0cc]/65 hover:bg-white/10"}`}>EN</button>
    </nav>
  </motion.header>;
}

function Hero({ content, lang, openAdmin }: { content: SiteContent; lang: Lang; openAdmin: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  return <section id="hero" className="min-h-screen px-3 py-3 sm:px-5 sm:py-5">
    <motion.div ref={ref} className="relative mx-auto h-[calc(100vh-24px)] min-h-[660px] max-w-[1460px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080808] shadow-[0_60px_180px_rgba(0,0,0,.8)] sm:h-[calc(100vh-40px)] sm:rounded-[2.7rem]" initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease }}>
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y: mediaY, scale: mediaScale }}>
        {content.hero.mediaType === "video"
          ? <HeroVideo src={content.hero.media} poster={content.hero.poster} className="opacity-80" />
          : <VideoOrImage src={content.hero.media} poster={content.hero.poster} type={content.hero.mediaType} className="absolute inset-0 opacity-80" />}
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,transparent_0,rgba(0,0,0,.15)_32%,rgba(0,0,0,.74)_80%),linear-gradient(0deg,rgba(0,0,0,.94)_0%,rgba(0,0,0,.2)_45%,rgba(0,0,0,.5)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-black/75 to-transparent" />
      <button aria-label="Open admin" onClick={openAdmin} className="absolute right-0 top-0 z-30 h-12 w-12 opacity-0" />
      <div className="absolute inset-x-0 bottom-0 z-10 grid items-end gap-5 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(270px,390px)] lg:p-10">
        <motion.h1 className="display keep-latin min-w-0 max-w-full whitespace-nowrap text-[clamp(2.6rem,9vw,7.5rem)] font-extrabold leading-[.82] tracking-[-.045em] text-[#e8e7d5] drop-shadow-2xl" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: .25, ease }}>{content.hero.title}</motion.h1>
        <motion.div className="mb-2 max-w-md" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .9, delay: .45, ease }}>
          <p className="text-xs leading-5 text-[#eeecd6]/75 sm:text-sm">{t(content.hero.description, lang)}</p>
          <a href="#contact" className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#e1e0cc] px-4 py-2.5 text-xs font-bold text-black transition hover:scale-[1.03] hover:bg-white">{t(content.hero.cta, lang)}<CircleArrowRight className="h-6 w-6" /></a>
        </motion.div>
      </div>
    </motion.div>
  </section>;
}

function About({ content, lang }: { content: SiteContent; lang: Lang }) {
  return <section id="about" className="container py-20 md:py-28"><Reveal><div className="panel mx-auto max-w-4xl rounded-[2rem] px-7 py-16 text-center md:rounded-[2.5rem] md:px-14 md:py-24">
    <p className="mb-8 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.about.label, lang)}</p>
    <h2 className="display mx-auto max-w-3xl text-balance text-[clamp(2.2rem,5.2vw,4.6rem)] font-bold leading-[.98] tracking-[-.03em]"><WordsPullUpMultiStyle segments={[{ text: t(content.about.prefix, lang) }, { text: t(content.about.accent, lang), className: "accent mx-2 text-[1.08em] font-medium" }, { text: t(content.about.suffix, lang) }]} /></h2>
    <WordOpacity text={t(content.about.body, lang)} />
  </div></Reveal></section>;
}

function Tools({ content, lang }: { content: SiteContent; lang: Lang }) {
  return <section id="tools" className="container py-14 md:py-20">
    <Reveal><div className="panel rounded-[2rem] p-7 md:rounded-[2.4rem] md:p-12">
      <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{lang === "ru" ? "Программы" : "Programs"}</p>
          <h2 className="display text-[clamp(2.1rem,3.8vw,3.4rem)] font-bold leading-[1] tracking-[-.02em]">{t(content.toolsIntro.title, lang)}</h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-[#e1e0cc]/45 md:text-right">{t(content.toolsIntro.subtitle, lang)}</p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {content.tools.map(tool => <div key={tool.id} className="flex flex-col items-center px-6 py-7 text-center sm:py-1">
          <div className="mb-5 flex h-11 items-center justify-center">{iconMap[tool.icon]}</div>
          <h3 className="text-base font-bold tracking-[-.02em]">{t(tool.title, lang)}</h3>
          <p className="mt-2 max-w-[15rem] text-xs leading-5 text-[#e1e0cc]/50">{t(tool.subtitle, lang)}</p>
        </div>)}
      </div>
    </div></Reveal>
  </section>;
}

function Collaborators({ content, lang }: { content: SiteContent; lang: Lang }) {
  const edit = useEdit();
  const editMode = !!edit?.editMode;
  const [selected, setSelected] = useState<Collaborator | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIntro, setEditingIntro] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const people = content.collaborators;
  const editingPerson = people.find(p => p.id === editingId) || null;

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = people.findIndex(p => p.id === active.id);
    const to = people.findIndex(p => p.id === over.id);
    edit?.setContent(prev => ({ ...prev, collaborators: arrayMove(prev.collaborators, from, to) }));
  }
  function addPerson() {
    const np: Collaborator = { id: uid("person"), name: { en: "New collaborator", ru: "Новый участник" }, role: { en: "Role", ru: "Роль" }, studio: "", bio: { en: "", ru: "" }, image: "", showreel: "", detailVideo: "", links: [] };
    edit?.setContent(prev => ({ ...prev, collaborators: [...prev.collaborators, np] }));
    setEditingId(np.id);
  }

  return <section id="collaborators" className="container py-24"><div className="panel rounded-[2.2rem] p-5 md:p-10 lg:p-16">
    <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
      <Reveal><div className="relative lg:sticky lg:top-10">
        <p className="mb-5 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.collaboratorsIntro.eyebrow, lang)}</p>
        <h2 className="display text-[clamp(2.5rem,5.8vw,5rem)] font-bold leading-[.92] tracking-[-.03em]"><span>{t(content.collaboratorsIntro.titlePrefix, lang)} </span><span className="accent block text-[1.08em]">{t(content.collaboratorsIntro.titleAccent, lang)}</span></h2>
        <p className="mt-8 max-w-sm text-sm leading-7 text-[#e1e0cc]/55">{t(content.collaboratorsIntro.body, lang)}</p>
        {editMode && <EditButton className="absolute right-0 top-0" onClick={() => setEditingIntro(true)} />}
      </div></Reveal>
      {editMode
        ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={people.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {people.map(p => <SortableItem key={p.id} id={p.id}><PersonTile person={p} lang={lang} onEdit={() => setEditingId(p.id)} /></SortableItem>)}
                <AddTile onClick={addPerson} label={lang === "ru" ? "Добавить" : "Add"} className="aspect-[.9]" />
              </div>
            </SortableContext>
          </DndContext>
        : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{people.map(person => <Reveal key={person.id}><PersonCard person={person} lang={lang} onClick={() => setSelected(person)} /></Reveal>)}</div>}
    </div>
  </div>
  <PersonModal person={selected} lang={lang} onClose={() => setSelected(null)} />
  <AnimatePresence>{editingPerson && <PersonEditPopover person={editingPerson} idx={people.findIndex(p => p.id === editingPerson.id)} onClose={() => setEditingId(null)} />}</AnimatePresence>
  <AnimatePresence>{editingIntro && <CollabIntroEditPopover content={content} onClose={() => setEditingIntro(false)} />}</AnimatePresence>
  </section>;
}

function PersonTile({ person, lang, onEdit }: { person: Collaborator; lang: Lang; onEdit: () => void }) {
  return <div className="group relative aspect-[.9] overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#111]">
    {person.image ? <img src={person.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
    <div className="absolute bottom-0 p-4"><h3 className="text-base font-bold tracking-[-.04em]">{t(person.name, lang)}</h3><p className="text-xs text-[#e1e0cc]/65">{t(person.role, lang)}</p></div>
    <EditButton className="absolute right-2 top-2 h-8 w-8" onClick={onEdit} />
  </div>;
}

function PersonEditPopover({ person, idx, onClose }: { person: Collaborator; idx: number; onClose: () => void }) {
  const edit = useEdit()!;
  const set = (f: string, v: unknown) => edit.update(`collaborators.${idx}.${f}`, v);
  const del = () => { edit.setContent(prev => ({ ...prev, collaborators: prev.collaborators.filter(p => p.id !== person.id) })); onClose(); };
  return <EditShell title="Edit collaborator" onClose={onClose} onDelete={del} wide>
    <div className="grid gap-5 md:grid-cols-[230px_1fr]">
      <div>
        {/* preview photo in the same portrait shape as the card */}
        <MediaDrop label="Preview photo" kind="image" value={person.image} onChange={v => set("image", v)} ratio="aspect-[.9]" />
        <MediaDrop label="Card showreel (plays after preview)" kind="video" value={person.showreel} onChange={v => set("showreel", v)} ratio="aspect-[.9]" />
        <MediaDrop label="Detail video (in the card)" kind="video" value={person.detailVideo} onChange={v => set("detailVideo", v)} />
      </div>
      <div>
        <EField label="Name (EN)" value={person.name.en} onChange={v => set("name.en", v)} />
        <EField label="Name (RU)" value={person.name.ru} onChange={v => set("name.ru", v)} />
        <EField label="Text under name (EN)" value={person.role.en} onChange={v => set("role.en", v)} />
        <EField label="Text under name (RU)" value={person.role.ru} onChange={v => set("role.ru", v)} />
        <EField label="Studio / company" value={person.studio} onChange={v => set("studio", v)} />
        <EField label="Bio (EN)" value={person.bio.en} onChange={v => set("bio.en", v)} textarea />
        <EField label="Bio (RU)" value={person.bio.ru} onChange={v => set("bio.ru", v)} textarea />
        <LinksEditor links={person.links} onChange={l => set("links", l)} />
      </div>
    </div>
  </EditShell>;
}

function CollabIntroEditPopover({ content, onClose }: { content: SiteContent; onClose: () => void }) {
  const edit = useEdit()!;
  const u = (p: string, v: string) => edit.update(p, v);
  return <EditShell title="Edit section header" onClose={onClose}>
    <EField label="Eyebrow (EN)" value={content.collaboratorsIntro.eyebrow.en} onChange={v => u("collaboratorsIntro.eyebrow.en", v)} />
    <EField label="Eyebrow (RU)" value={content.collaboratorsIntro.eyebrow.ru} onChange={v => u("collaboratorsIntro.eyebrow.ru", v)} />
    <EField label="Title prefix (EN)" value={content.collaboratorsIntro.titlePrefix.en} onChange={v => u("collaboratorsIntro.titlePrefix.en", v)} />
    <EField label="Title prefix (RU)" value={content.collaboratorsIntro.titlePrefix.ru} onChange={v => u("collaboratorsIntro.titlePrefix.ru", v)} />
    <EField label="Title accent (EN)" value={content.collaboratorsIntro.titleAccent.en} onChange={v => u("collaboratorsIntro.titleAccent.en", v)} />
    <EField label="Title accent (RU)" value={content.collaboratorsIntro.titleAccent.ru} onChange={v => u("collaboratorsIntro.titleAccent.ru", v)} />
    <EField label="Body (EN)" value={content.collaboratorsIntro.body.en} onChange={v => u("collaboratorsIntro.body.en", v)} textarea />
    <EField label="Body (RU)" value={content.collaboratorsIntro.body.ru} onChange={v => u("collaboratorsIntro.body.ru", v)} textarea />
  </EditShell>;
}
function PersonCard({ person, lang, onClick }: { person: Collaborator; lang: Lang; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="group relative aspect-[.9] w-full overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#111] text-left transition hover:-translate-y-1 hover:border-white/25"><img src={person.image} alt={t(person.name, lang)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><AnimatePresence>{hover && <motion.video key="showreel" src={person.showreel} poster={person.image} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease }} />}</AnimatePresence><div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /><div className="absolute bottom-0 p-5"><h3 className="text-xl font-bold tracking-[-.04em]">{t(person.name, lang)}</h3><p className="mt-1 text-sm text-[#e1e0cc]/65">{t(person.role, lang)}</p><p className="mt-4 mono text-[10px] font-medium uppercase tracking-[.18em] text-[#e1e0cc]/65">{person.studio}</p></div></button>;
}
function PersonModal({ person, lang, onClose }: { person: Collaborator | null; lang: Lang; onClose: () => void }) {
  return <AnimatePresence>{person && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div onClick={e => e.stopPropagation()} className="panel max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[2rem] p-4 md:p-6" initial={{ y: 30, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, scale: .97 }}><div className="mb-4 flex justify-end"><button onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X /></button></div><div className="grid gap-6 md:grid-cols-[1.15fr_.85fr]"><div className="overflow-hidden rounded-[1.4rem]"><VideoOrImage src={person.detailVideo} poster={person.image} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e1e0cc]/45">{person.studio}</p><h3 className="mt-3 text-4xl font-bold tracking-[-.06em]">{t(person.name, lang)}</h3><p className="mt-2 text-[#d89b57]">{t(person.role, lang)}</p><p className="mt-7 text-sm leading-7 text-[#e1e0cc]/65">{t(person.bio, lang)}</p><div className="mt-8 flex flex-wrap gap-2">{person.links.map(l => <a key={l.label} className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/10" href={l.url} target="_blank">{l.label}</a>)}</div></div></div></motion.div></motion.div>}</AnimatePresence>;
}

// Views pill + round client avatar, shown over each work video and in the modal.
function ViewsAvatar({ views, avatar, name, size = "card" }: { views: string; avatar: string; name?: string; size?: "card" | "modal" }) {
  const big = size === "modal";
  return <div className="flex items-center gap-2">
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-black/55 font-medium text-[#e8e7d5] backdrop-blur-md ${big ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]"}`}><Eye className={big ? "h-3.5 w-3.5" : "h-3 w-3"} />{views}</span>
    <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/45 py-0.5 pl-0.5 pr-2 backdrop-blur-md">
      <img src={avatar} alt={name || ""} className={`shrink-0 rounded-full border border-white/40 object-cover ${big ? "h-9 w-9" : "h-7 w-7"}`} />
      {name && <span className={`truncate font-medium text-[#e8e7d5] ${big ? "text-sm" : "max-w-[6.5rem] text-[11px]"}`}>{name}</span>}
    </span>
  </div>;
}

// Masonry grid tuning. Small auto-row unit + per-item row-span gives a real
// multi-column grid where verticals (9:16) are tall, horizontals (16:9) short,
// and items pack densely so a horizontal can sit under a vertical in a column.
const ROW_UNIT = 8, GRID_GAP = 12;
function spanFor(orientation: "landscape" | "portrait", colW: number) {
  if (!colW) return undefined;
  const h = orientation === "portrait" ? colW * 16 / 9 : colW * 9 / 16;
  return Math.max(1, Math.round((h + GRID_GAP) / (ROW_UNIT + GRID_GAP)));
}

function Work({ content, lang }: { content: SiteContent; lang: Lang }) {
  const edit = useEdit();
  const editMode = !!edit?.editMode;
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIntro, setEditingIntro] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const works = content.works;
  const editingWork = works.find(w => w.id === editingId) || null;

  // Measure column width so each card's row-span yields the correct aspect.
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(3);
  const [colW, setColW] = useState(360);
  useEffect(() => {
    if (!grid) return;
    const compute = () => {
      const c = window.innerWidth >= 768 ? 3 : 2;
      setCols(c);
      setColW((grid.clientWidth - GRID_GAP * (c - 1)) / c);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [grid]);
  const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: `${ROW_UNIT}px`, gridAutoFlow: "row dense", gap: `${GRID_GAP}px` };

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = works.findIndex(w => w.id === active.id);
    const to = works.findIndex(w => w.id === over.id);
    edit?.setContent(prev => ({ ...prev, works: arrayMove(prev.works, from, to) }));
  }
  function addWork() {
    const nw: WorkItem = { id: uid("work"), orientation: "landscape", video: "", poster: "", avatar: "", client: { en: "New client", ru: "Новый клиент" }, views: "0", title: { en: "New work", ru: "Новая работа" }, description: { en: "", ru: "" }, links: [] };
    edit?.setContent(prev => ({ ...prev, works: [...prev.works, nw] }));
    setEditingId(nw.id);
  }

  return <section id="work" className="container py-16 md:py-24"><div className="panel rounded-[2.2rem] p-5 md:rounded-[2.6rem] md:p-12">
    <Reveal><div className="relative mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-3 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.workIntro.eyebrow, lang)}</p>
        <h2 className="display text-[clamp(2.4rem,5vw,4.6rem)] font-bold leading-[.96] tracking-[-.03em]">{t(content.workIntro.title, lang)}</h2>
      </div>
      <p className="max-w-xs text-sm leading-6 text-[#e1e0cc]/45 md:text-right">{t(content.workIntro.subtitle, lang)}</p>
      {editMode && <EditButton className="absolute right-0 top-0" onClick={() => setEditingIntro(true)} />}
    </div></Reveal>

    {editMode
      ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={works.map(w => w.id)} strategy={rectSortingStrategy}>
            <div ref={setGrid} style={gridStyle}>
              {works.map(w => <SortableItem key={w.id} id={w.id} style={{ gridRow: `span ${spanFor(w.orientation, colW)}` }}><EditWorkCard work={w} lang={lang} onEdit={() => setEditingId(w.id)} /></SortableItem>)}
              <div style={{ gridRow: `span ${spanFor("landscape", colW)}` }}><AddTile onClick={addWork} label={lang === "ru" ? "Добавить видео" : "Add video"} className="h-full" /></div>
            </div>
          </SortableContext>
        </DndContext>
      : <div ref={setGrid} style={gridStyle}>
          {works.map(w => <div key={w.id} style={{ gridRow: `span ${spanFor(w.orientation, colW)}` }}>
            <WorkCard work={w} lang={lang} onClick={() => setSelected(w)} />
          </div>)}
        </div>}

    <WorkModal work={selected} lang={lang} onClose={() => setSelected(null)} />
    <AnimatePresence>{editingWork && <WorkEditPopover work={editingWork} idx={works.findIndex(w => w.id === editingWork.id)} onClose={() => setEditingId(null)} />}</AnimatePresence>
    <AnimatePresence>{editingIntro && <IntroEditPopover content={content} onClose={() => setEditingIntro(false)} />}</AnimatePresence>
  </div></section>;
}

// Edit-mode card — identical to the public WorkCard (real orientation, masonry)
// plus a pencil and drag-to-reorder.
function EditWorkCard({ work, lang, onEdit }: { work: WorkItem; lang: Lang; onEdit: () => void }) {
  return <div className="group relative h-full w-full overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#111]">
    {work.poster ? <img src={work.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      : work.video ? <video src={work.video} muted loop playsInline className="absolute inset-0 h-full w-full object-cover" /> : null}
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
    <div className="absolute right-3 top-3 z-10"><ViewsAvatar views={work.views} avatar={work.avatar} name={t(work.client, lang)} /></div>
    <span className="absolute bottom-3 left-3 right-12 truncate text-sm font-bold tracking-[-.02em] drop-shadow">{t(work.title, lang)}</span>
    <EditButton className="absolute bottom-3 right-3" onClick={onEdit} />
  </div>;
}

function WorkEditPopover({ work, idx, onClose }: { work: WorkItem; idx: number; onClose: () => void }) {
  const edit = useEdit()!;
  const set = (field: string, value: unknown) => edit.update(`works.${idx}.${field}`, value);
  const del = () => { edit.setContent(prev => ({ ...prev, works: prev.works.filter(w => w.id !== work.id) })); onClose(); };
  const portrait = work.orientation === "portrait";
  const ratio = portrait ? "aspect-[9/16]" : "aspect-video";
  return <EditShell title="Edit video" onClose={onClose} onDelete={del} wide>
    <div className="mb-5">
      <p className="mb-1.5 text-xs text-[#e1e0cc]/60">Format — how it shows in the grid</p>
      <div className="flex gap-2">
        {(["landscape", "portrait"] as const).map(o => <button key={o} onClick={() => set("orientation", o)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${work.orientation === o ? "border-[#d89b57] bg-[#d89b57]/15 text-white" : "border-white/10 text-[#e1e0cc]/70 hover:bg-white/5"}`}><span className={`rounded-[3px] border border-current ${o === "portrait" ? "h-4 w-2.5" : "h-2.5 w-4"}`} />{o === "portrait" ? "9:16 vertical" : "16:9 horizontal"}</button>)}
      </div>
    </div>
    <div className={`grid gap-5 ${portrait ? "md:grid-cols-[230px_1fr]" : "md:grid-cols-[1.5fr_1fr]"}`}>
      <div>
        {/* WYSIWYG preview: same shape + overlays as the live card */}
        <div className={`relative mb-3 overflow-hidden rounded-[1.2rem] border border-white/10 bg-black ${ratio}`}>
          {work.video ? <video src={work.video} poster={work.poster} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
            : work.poster ? <img src={work.poster} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
          <div className="absolute right-2 top-2 scale-90 origin-top-right"><ViewsAvatar views={work.views || "0"} avatar={work.avatar} name={work.client.en} /></div>
          <span className="absolute bottom-2 left-3 right-3 truncate text-xs font-bold drop-shadow">{work.title.en}</span>
        </div>
        <MediaDrop label="Video" kind="video" value={work.video} onChange={v => set("video", v)} ratio={ratio} />
        <MediaDrop label="Poster (shown before play)" kind="image" value={work.poster} onChange={v => set("poster", v)} ratio={ratio} />
      </div>
      <div>
        <div className="mb-3 flex items-end gap-3">
          <div className="shrink-0"><MediaDrop label="Avatar" kind="image" value={work.avatar} onChange={v => set("avatar", v)} round /></div>
          <div className="min-w-0 flex-1"><EField label="Views" value={work.views} onChange={v => set("views", v)} placeholder="1.2M" /></div>
        </div>
        <EField label="Client name (EN)" value={work.client.en} onChange={v => set("client.en", v)} />
        <EField label="Client name (RU)" value={work.client.ru} onChange={v => set("client.ru", v)} />
        <EField label="Title (EN)" value={work.title.en} onChange={v => set("title.en", v)} />
        <EField label="Title (RU)" value={work.title.ru} onChange={v => set("title.ru", v)} />
        <EField label="Description (EN)" value={work.description.en} onChange={v => set("description.en", v)} textarea />
        <EField label="Description (RU)" value={work.description.ru} onChange={v => set("description.ru", v)} textarea />
        <LinksEditor links={work.links} onChange={l => set("links", l)} />
      </div>
    </div>
  </EditShell>;
}

function IntroEditPopover({ content, onClose }: { content: SiteContent; onClose: () => void }) {
  const edit = useEdit()!;
  const u = (p: string, v: string) => edit.update(p, v);
  return <EditShell title="Edit section header" onClose={onClose}>
    <EField label="Eyebrow (EN)" value={content.workIntro.eyebrow.en} onChange={v => u("workIntro.eyebrow.en", v)} />
    <EField label="Eyebrow (RU)" value={content.workIntro.eyebrow.ru} onChange={v => u("workIntro.eyebrow.ru", v)} />
    <EField label="Title (EN)" value={content.workIntro.title.en} onChange={v => u("workIntro.title.en", v)} />
    <EField label="Title (RU)" value={content.workIntro.title.ru} onChange={v => u("workIntro.title.ru", v)} />
    <EField label="Subtitle (EN)" value={content.workIntro.subtitle.en} onChange={v => u("workIntro.subtitle.en", v)} textarea />
    <EField label="Subtitle (RU)" value={content.workIntro.subtitle.ru} onChange={v => u("workIntro.subtitle.ru", v)} textarea />
  </EditShell>;
}

function WorkCard({ work, lang, onClick }: { work: WorkItem; lang: Lang; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="group relative block h-full w-full overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#111] text-left transition duration-500 hover:-translate-y-1 hover:border-white/25">
      <img src={work.poster} alt={t(work.title, lang)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
      <AnimatePresence>{hover && <motion.video key="v" src={work.video} poster={work.poster} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .8, ease }} />}</AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
      <div className="absolute right-3 top-3 z-10"><ViewsAvatar views={work.views} avatar={work.avatar} name={t(work.client, lang)} /></div>
      <span className="absolute bottom-3 left-3 right-3 z-10 truncate text-sm font-bold tracking-[-.02em] drop-shadow">{t(work.title, lang)}</span>
      <span className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 opacity-0 backdrop-blur-md transition duration-500 group-hover:opacity-100"><Play className="h-5 w-5 translate-x-px fill-current" /></span>
  </button>;
}

function WorkModal({ work, lang, onClose }: { work: WorkItem | null; lang: Lang; onClose: () => void }) {
  const portrait = work?.orientation === "portrait";
  return <AnimatePresence>{work && <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/82 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div onClick={e => e.stopPropagation()} className={`panel max-h-[92vh] w-full overflow-auto rounded-[1.8rem] p-4 md:p-6 ${portrait ? "max-w-3xl" : "max-w-5xl"}`} initial={{ y: 28, scale: .96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 24, scale: .97, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(work.client, lang)}</p>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"><X className="h-4 w-4" /></button>
      </div>
      <div className={`grid gap-6 ${portrait ? "md:grid-cols-[minmax(0,300px)_1fr]" : "md:grid-cols-[1.55fr_1fr]"}`}>
        <div className={`overflow-hidden rounded-[1.2rem] bg-black ${portrait ? "aspect-[9/16] md:max-h-[78vh]" : "aspect-video"}`}>
          <video src={work.video} poster={work.poster} autoPlay muted loop playsInline controls className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <ViewsAvatar views={work.views} avatar={work.avatar} name={t(work.client, lang)} size="modal" />
          <h3 className="display mt-5 text-3xl font-bold tracking-[-.04em]">{t(work.title, lang)}</h3>
          <p className="mt-4 text-sm leading-7 text-[#e1e0cc]/60">{t(work.description, lang)}</p>
          {work.links?.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{work.links.filter(l => l.label).map(l => <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:border-[#d89b57]/40 hover:bg-white/10">{l.label}</a>)}</div>}
          <a href="#contact" onClick={onClose} className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-xs font-bold text-[#e1e0cc]/85 transition hover:text-white">{lang === "ru" ? "Обсудить проект" : "Discuss a project"}<ArrowUpRight className="h-3.5 w-3.5" /></a>
        </div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

function Contact({ content, lang }: { content: SiteContent; lang: Lang }) {
  return <section id="contact" className="container py-24"><div className="grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr]"><Reveal><div><p className="mb-5 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.contact.eyebrow, lang)}</p><h2 className="display max-w-xl text-[clamp(2.6rem,5vw,5rem)] font-bold leading-[.94] tracking-[-.03em]">{t(content.contact.title, lang)}</h2><p className="mt-8 max-w-md text-sm leading-7 text-[#e1e0cc]/55">{t(content.contact.body, lang)}</p></div></Reveal><Reveal><div className="flex flex-col gap-4 sm:flex-row"><ContactLink href={telegramUrl} icon={<TelegramIcon />} label="Telegram" handle={telegramHandle} /><ContactLink href={instagramUrl} icon={<InstagramIcon />} label="Instagram" handle={instagramHandle} /></div></Reveal></div></section>;
}
function ContactLink({ href, icon, label, handle }: { href: string; icon: React.ReactNode; label: string; handle: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="panel group relative flex flex-1 items-center gap-4 overflow-hidden rounded-[1.7rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-[#d89b57]/40">
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e1e0cc]/[.07] text-[#d89b57] transition duration-500 group-hover:bg-[#d89b57] group-hover:text-black">{icon}</span>
    <span className="min-w-0"><span className="block text-lg font-bold tracking-[-.02em]">{label}</span><span className="mono block truncate text-xs text-[#e1e0cc]/45">{handle}</span></span>
    <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 text-[#e1e0cc]/35 transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#e1e0cc]" />
  </a>;
}

function structuredCloneAndSet<T>(obj: T, path: string, value: unknown): T { const clone = structuredClone(obj); const parts = path.split("."); let cur: any = clone; for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]; cur[parts.at(-1)!] = value; return clone; }

// Cinematic camera-focus cursor: four AF corner brackets that track the pointer
// and lock onto interactive elements like a viewfinder focus box. The brackets
// breathe, rotate on press, and frame a tiny center tick + live coordinate
// readout. Desktop / fine-pointer only; respects reduced-motion.
function CustomCursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const fx = useSpring(x, { stiffness: 700, damping: 40, mass: .5 });
  const fy = useSpring(y, { stiffness: 700, damping: 40, mass: .5 });
  const size = useSpring(34, { stiffness: 300, damping: 26 });
  const [locked, setLocked] = useState(false);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState("0000 · 0000");

  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const pad = (n: number) => String(Math.round(n)).padStart(4, "0");
    const move = (e: MouseEvent) => {
      x.set(e.clientX); y.set(e.clientY); setVisible(true);
      setCoords(`${pad(e.clientX)} · ${pad(e.clientY)}`);
      const el = e.target;
      const hit = el instanceof Element ? el.closest("a, button, [role=button], input, textarea, label, [data-cursor]") : null;
      setLocked(!!hit);
      size.set(hit ? Math.min(Math.max(hit.getBoundingClientRect().width, 44), 120) : 34);
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => setVisible(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.documentElement.classList.add("custom-cursor");
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, [reduce, x, y, size]);

  if (reduce) return null;
  const stroke = locked ? "#d89b57" : "#f4f0e2";
  const corner = "absolute h-3.5 w-3.5 border-[1.5px]";
  return <div className="pointer-events-none fixed inset-0 z-[100] hidden md:block" aria-hidden style={{ opacity: visible ? 1 : 0, transition: "opacity .25s ease" }}>
    {/* exact-tracking center tick */}
    <motion.div className="absolute -ml-px -mt-px h-0.5 w-0.5 rounded-full" style={{ x, y, background: stroke }} animate={{ scale: down ? 2.4 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 24 }} />
    {/* lagging focus frame */}
    <motion.div className="absolute left-0 top-0" style={{ x: fx, y: fy }}>
      <motion.div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size }} animate={{ rotate: down ? 45 : locked ? 0 : 0, scale: down ? .82 : 1 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
        <span className={`${corner} left-0 top-0 border-b-0 border-r-0`} style={{ borderColor: stroke }} />
        <span className={`${corner} right-0 top-0 border-b-0 border-l-0`} style={{ borderColor: stroke }} />
        <span className={`${corner} bottom-0 left-0 border-r-0 border-t-0`} style={{ borderColor: stroke }} />
        <span className={`${corner} bottom-0 right-0 border-l-0 border-t-0`} style={{ borderColor: stroke }} />
      </motion.div>
      {/* live coordinate readout, fades in on lock */}
      <motion.span className="mono absolute whitespace-nowrap text-[9px] tracking-[.2em]" style={{ color: stroke, left: 14, top: 12 }} animate={{ opacity: locked ? .85 : 0 }} transition={{ duration: .2 }}>{coords}</motion.span>
    </motion.div>
  </div>;
}

// Password gate. On success you "enter" the live site in edit mode.
function LoginGate({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  async function submit() { if (await sha256Hex(pw) === adminPasswordHash) onSuccess(); else setErr("Wrong password"); }
  return <motion.div className="fixed inset-0 z-[96] grid place-items-center bg-black/80 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div onClick={e => e.stopPropagation()} className="panel w-full max-w-xs rounded-[1.3rem] p-5" initial={{ y: 18, scale: .97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 14, scale: .98, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <p className="mb-3 text-sm font-medium text-[#e8e7d5]">Admin login</p>
      <input autoFocus type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Password" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#e1e0cc] outline-none transition focus:border-[#d89b57]/50 focus:shadow-[0_0_0_3px_rgba(216,155,87,0.12)]" />
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      <button onClick={submit} className="mt-3 w-full rounded-full bg-[#e1e0cc] py-2.5 text-sm font-bold text-black transition hover:bg-white active:scale-[.98]">Enter edit mode</button>
    </motion.div>
  </motion.div>;
}

export default function Home() {
  const { content, setContent, sync, setSync } = useSiteContent();
  const [lang, setLang] = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  useSmoothScroll();

  useEffect(() => { try { if (sessionStorage.getItem("editMode") === "1") setEditMode(true); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem("editMode", editMode ? "1" : "0"); } catch {} }, [editMode]);

  // Ctrl+Alt+A opens the login (e.code so it works on any keyboard layout).
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.ctrlKey && e.altKey && e.code === "KeyA") { e.preventDefault(); if (!editMode) setLoginOpen(true); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [editMode]);

  const update = useCallback((path: string, value: unknown) => setContent(prev => structuredCloneAndSet(prev, path, value)), [setContent]);
  const upload = useCallback(async (file: File) => {
    setSync("saving");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) { setSync("error"); throw new Error("upload failed"); }
    const { url } = await res.json();
    setSync("idle");
    return url as string;
  }, [setSync]);

  const api = useMemo<EditAPI>(() => ({ editMode, setEditMode, setContent, update, upload, sync }), [editMode, setContent, update, upload, sync]);

  return <EditContext.Provider value={api}><main className="relative">
    <CustomCursor />
    <Header lang={lang} setLang={setLang} />
    <Hero content={content} lang={lang} openAdmin={() => { if (!editMode) setLoginOpen(true); }} />
    <Tools content={content} lang={lang} />
    <Work content={content} lang={lang} />
    <Collaborators content={content} lang={lang} />
    <Contact content={content} lang={lang} />
    <footer className="container flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-10 text-sm text-[#e1e0cc]/45"><span>{lang === "ru" ? "© 2026 alex.creates — кинематографичный монтаж и режиссура." : "© 2026 alex.creates — cinematic editing and direction."}</span><span className="mono text-xs tracking-[.2em] text-[#e1e0cc]/35">v0.3</span></footer>
    <AdminBar />
    <AnimatePresence>{loginOpen && <LoginGate onClose={() => setLoginOpen(false)} onSuccess={() => { setEditMode(true); setLoginOpen(false); }} />}</AnimatePresence>
  </main></EditContext.Provider>;
}
