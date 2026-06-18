"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, CircleArrowRight, Film, Pencil, Plus, Save, Trash2, X, Brain, Sparkles, Scissors, Box } from "lucide-react";
import Lenis from "lenis";
import NumberFlow from "@number-flow/react";
import { defaultContent, languageKey, Lang, SiteContent, storageKey, ToolCard, Collaborator } from "@/lib/content";

const ease = [0.22, 1, 0.36, 1] as const;
const adminPasswordFallback = "alexcreates";
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

function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setContent(JSON.parse(saved));
    } catch { setContent(defaultContent); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(storageKey, JSON.stringify(content)); }, [content, hydrated]);
  return [content, setContent] as const;
}

function useLanguage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(languageKey);
    if (saved === "ru" || saved === "en") setLang(saved);
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

function Hero({ content, lang, setLang, openAdmin }: { content: SiteContent; lang: Lang; setLang: (l: Lang) => void; openAdmin: () => void }) {
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
      <nav className="absolute left-1/2 top-5 z-20 flex w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-white/10 bg-black/58 p-1.5 text-[13px] shadow-2xl backdrop-blur-xl sm:top-7 sm:w-auto sm:flex-nowrap">
        {t(content.nav, lang).map((item, i) => <a key={item} href={["#about", "#collaborators", "#tools", "#stats", "#contact"][i]} className="rounded-full px-4 py-2.5 text-[#e1e0cc]/80 transition hover:bg-white/10 hover:text-white">{item}</a>)}
        <span className="mx-1.5 hidden h-6 w-px bg-white/15 sm:block" />
        <button onClick={() => setLang("ru")} className={`rounded-full px-3.5 py-2.5 font-medium ${lang === "ru" ? "bg-[#e1e0cc] text-black" : "text-[#e1e0cc]/65 hover:bg-white/10"}`}>RU</button>
        <button onClick={() => setLang("en")} className={`rounded-full px-3.5 py-2.5 font-medium ${lang === "en" ? "bg-[#e1e0cc] text-black" : "text-[#e1e0cc]/65 hover:bg-white/10"}`}>EN</button>
      </nav>
      <button aria-label="Open admin" onClick={openAdmin} className="absolute right-0 top-0 z-30 h-12 w-12 opacity-0" />
      <div className="absolute inset-x-0 bottom-0 z-10 grid items-end gap-5 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(270px,390px)] lg:p-10">
        <motion.h1 className="display min-w-0 max-w-full whitespace-nowrap text-[clamp(2.6rem,9vw,7.5rem)] font-extrabold leading-[.82] tracking-[-.045em] text-[#e8e7d5] drop-shadow-2xl" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: .25, ease }}>{content.hero.title}</motion.h1>
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
  return <section id="tools" className="border-y border-white/5 bg-[#050505] py-24"><div className="container">
    <Reveal><div className="mb-10 text-center"><h2 className="display text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-.025em]">{t(content.toolsIntro.title, lang)}</h2><p className="text-xl text-[#e1e0cc]/50">{t(content.toolsIntro.subtitle, lang)}</p></div></Reveal>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Reveal><div className="group relative min-h-[430px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#101010]"><VideoOrImage src={content.toolsIntro.canvasShowreel} poster={content.toolsIntro.canvasPoster} /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" /><h3 className="absolute bottom-7 left-6 max-w-[13rem] text-2xl font-bold tracking-[-.05em]">{t(content.toolsIntro.canvasTitle, lang)}</h3></div></Reveal>
      {content.tools.map((tool, i) => <ToolCardView key={tool.id} tool={tool} lang={lang} delay={(i + 1) * .06} />)}
    </div>
  </div></section>;
}
function ToolCardView({ tool, lang, delay }: { tool: ToolCard; lang: Lang; delay: number }) {
  const [hover, setHover] = useState(false);
  return <Reveal delay={delay}><article onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="group relative min-h-[430px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#191919] p-7 transition duration-500 hover:-translate-y-2 hover:border-[#d89b57]/35">
    <AnimatePresence>{hover && <motion.video key="hover" src={tool.showreel} poster={tool.poster} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: .58, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: .6, ease }} />}</AnimatePresence>
    <div className="absolute inset-0 bg-gradient-to-t from-black via-[#111]/85 to-[#111]/40" />
    <div className="relative z-10 flex h-full flex-col"><div className="mb-8">{iconMap[tool.icon]}</div><h3 className="text-2xl font-bold leading-none tracking-[-.05em]">{t(tool.title, lang)}</h3><p className="mt-4 text-sm leading-6 text-[#e1e0cc]/55">{t(tool.subtitle, lang)}</p><ul className="mt-8 space-y-4 text-xs leading-5 text-[#e1e0cc]/62">{t(tool.checklist, lang).map(item => <li key={item} className="flex gap-3"><span className="text-[#e1e0cc]">✓</span>{item}</li>)}</ul><a href={tool.link} className="mt-auto inline-flex items-center gap-2 text-xs font-bold text-[#e1e0cc]/85 hover:text-white">{lang === "ru" ? "Подробнее" : "Learn more"} <ArrowUpRight className="h-3.5 w-3.5" /></a></div>
  </article></Reveal>;
}

function Collaborators({ content, lang }: { content: SiteContent; lang: Lang }) {
  const [selected, setSelected] = useState<Collaborator | null>(null);
  return <section id="collaborators" className="container py-24"><div className="panel rounded-[2.2rem] p-5 md:p-10 lg:p-16">
    <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><Reveal><div className="lg:sticky lg:top-10"><p className="mb-5 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.collaboratorsIntro.eyebrow, lang)}</p><h2 className="display text-[clamp(2.5rem,5.8vw,5rem)] font-bold leading-[.92] tracking-[-.03em]"><span>{t(content.collaboratorsIntro.titlePrefix, lang)} </span><span className="accent block text-[1.08em]">{t(content.collaboratorsIntro.titleAccent, lang)}</span></h2><p className="mt-8 max-w-sm text-sm leading-7 text-[#e1e0cc]/55">{t(content.collaboratorsIntro.body, lang)}</p></div></Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{content.collaborators.map(person => <Reveal key={person.id}><PersonCard person={person} lang={lang} onClick={() => setSelected(person)} /></Reveal>)}</div></div>
  </div><PersonModal person={selected} lang={lang} onClose={() => setSelected(null)} /></section>;
}
function PersonCard({ person, lang, onClick }: { person: Collaborator; lang: Lang; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="group relative aspect-[.9] w-full overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#111] text-left transition hover:-translate-y-1 hover:border-white/25"><img src={person.image} alt={t(person.name, lang)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />{hover && <video src={person.showreel} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /><div className="absolute bottom-0 p-5"><h3 className="text-xl font-bold tracking-[-.04em]">{t(person.name, lang)}</h3><p className="mt-1 text-sm text-[#e1e0cc]/65">{t(person.role, lang)}</p><p className="mt-4 mono text-[10px] font-medium uppercase tracking-[.18em] text-[#e1e0cc]/65">{person.studio}</p></div></button>;
}
function PersonModal({ person, lang, onClose }: { person: Collaborator | null; lang: Lang; onClose: () => void }) {
  return <AnimatePresence>{person && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div onClick={e => e.stopPropagation()} className="panel max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[2rem] p-4 md:p-6" initial={{ y: 30, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, scale: .97 }}><div className="mb-4 flex justify-end"><button onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X /></button></div><div className="grid gap-6 md:grid-cols-[1.15fr_.85fr]"><div className="overflow-hidden rounded-[1.4rem]"><VideoOrImage src={person.detailVideo} poster={person.image} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e1e0cc]/45">{person.studio}</p><h3 className="mt-3 text-4xl font-bold tracking-[-.06em]">{t(person.name, lang)}</h3><p className="mt-2 text-[#d89b57]">{t(person.role, lang)}</p><p className="mt-7 text-sm leading-7 text-[#e1e0cc]/65">{t(person.bio, lang)}</p><div className="mt-8 flex flex-wrap gap-2">{person.links.map(l => <a key={l.label} className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/10" href={l.url} target="_blank">{l.label}</a>)}</div></div></div></motion.div></motion.div>}</AnimatePresence>;
}

function Stats({ content, lang }: { content: SiteContent; lang: Lang }) {
  return <section id="stats" className="container py-12 md:py-24"><div className="panel rounded-[2.2rem] p-7 md:p-14"><div className="grid gap-8 md:grid-cols-2"><Reveal><div><p className="mb-5 mono text-[10px] font-medium uppercase tracking-[.3em] text-[#e1e0cc]/55">{t(content.statsIntro.eyebrow, lang)}</p><h2 className="display text-[clamp(2.4rem,5vw,5rem)] font-bold leading-[.94] tracking-[-.03em]">{t(content.statsIntro.titlePrefix, lang)} <span className="accent">{t(content.statsIntro.titleAccent, lang)}</span> {t(content.statsIntro.titleSuffix, lang)}</h2></div></Reveal><Reveal><p className="max-w-sm text-sm leading-7 text-[#e1e0cc]/55">{t(content.statsIntro.body, lang)}</p></Reveal></div><div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{content.stats.map(s => <CounterStat key={s.id} stat={s} lang={lang} />)}</div><div className="mt-16 grid gap-8 md:grid-cols-[.6fr_1.4fr] md:items-end"><div><p className="mb-8 max-w-sm text-lg leading-7 text-[#e1e0cc]/65">{lang === "ru" ? "Каждый проект — возможность учиться, расти и двигать креативность дальше." : "Every project is an opportunity to learn, to grow, and to push creativity further."}</p><a href="#contact" className="inline-flex items-center gap-3 rounded-full bg-[#e1e0cc] px-5 py-3 text-sm font-bold text-black hover:bg-white">{t(content.statsIntro.cta, lang)}<CircleArrowRight /></a></div><img src={content.statsIntro.image} alt="Cinematic sunset" className="h-72 w-full rounded-[1.4rem] object-cover" /></div></div></section>;
}
function CounterStat({ stat, lang }: { stat: SiteContent["stats"][number]; lang: Lang }) {
  const ref = useRef<HTMLDivElement | null>(null); const inView = useInView(ref, { once: true, amount: .45 });
  return <div ref={ref} className="border-white/10 text-center sm:border-r last:border-r-0"><div className="display text-6xl tracking-[-.03em]"><NumberFlow value={inView ? stat.value : 0} suffix={stat.suffix} transformTiming={{ duration: 1300, easing: "cubic-bezier(0.22,1,0.36,1)" }} /></div><p className="mt-3 text-sm font-bold">{t(stat.label, lang)}</p><p className="mx-auto mt-3 max-w-[12rem] text-xs leading-5 text-[#e1e0cc]/42">{t(stat.description, lang)}</p></div>;
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

function AdminPanel({ open, onClose, content, setContent }: { open: boolean; onClose: () => void; content: SiteContent; setContent: React.Dispatch<React.SetStateAction<SiteContent>> }) {
  const [unlocked, setUnlocked] = useState(false); const [password, setPassword] = useState(""); const [status, setStatus] = useState("");
  function login() { if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || adminPasswordFallback)) setUnlocked(true); else setStatus("Wrong password. Demo default: alexcreates"); }
  function update(path: string, value: unknown) { setContent(prev => structuredCloneAndSet(prev, path, value)); }
  function addTool() { setContent(prev => ({ ...prev, tools: [...prev.tools, { ...prev.tools[0], id: uid("tool"), title: { en: "New tool", ru: "Новый инструмент" } }] })); }
  function addPerson() { setContent(prev => ({ ...prev, collaborators: [...prev.collaborators, { ...prev.collaborators[0], id: uid("person"), name: { en: "New collaborator", ru: "Новый участник" } }] })); }
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[90] bg-black/86 p-3 backdrop-blur-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b0b0b]"><header className="flex items-center justify-between border-b border-white/10 p-4"><div><p className="text-xs uppercase tracking-[.25em] text-[#e1e0cc]/45">Hidden admin</p><h2 className="text-2xl font-bold">alex.creates control room</h2></div><button onClick={onClose} className="rounded-full bg-white/10 p-2"><X /></button></header>{!unlocked ? <div className="m-auto w-full max-w-sm p-6"><p className="mb-4 text-sm text-[#e1e0cc]/60">Password protected. Demo password: <b>alexcreates</b>. Set NEXT_PUBLIC_ADMIN_PASSWORD and ADMIN_PASSWORD for production.</p><input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && login()} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3" type="password" placeholder="Password" /><button onClick={login} className="mt-3 w-full rounded-full bg-[#e1e0cc] py-3 font-bold text-black">Unlock</button><p className="mt-3 text-sm text-red-200">{status}</p></div> : <div className="overflow-auto p-4"><div className="mb-4 flex flex-wrap gap-2"><button onClick={() => localStorage.setItem(storageKey, JSON.stringify(content))} className="rounded-full bg-white/10 px-4 py-2 text-sm"><Save className="mr-2 inline h-4 w-4" />Save content locally</button><button onClick={() => { localStorage.removeItem(storageKey); setContent(defaultContent); }} className="rounded-full bg-red-500/15 px-4 py-2 text-sm">Reset content</button><button onClick={addTool} className="rounded-full bg-white/10 px-4 py-2 text-sm"><Plus className="mr-2 inline h-4 w-4" />Tool</button><button onClick={addPerson} className="rounded-full bg-white/10 px-4 py-2 text-sm"><Plus className="mr-2 inline h-4 w-4" />Collaborator</button></div><div className="grid gap-4 lg:grid-cols-2"><AdminSection title="Hero media + bilingual copy"><AdminInput label="Hero video/image URL" value={content.hero.media} onChange={v => update("hero.media", v)} /><AdminInput label="Hero poster" value={content.hero.poster} onChange={v => update("hero.poster", v)} /><AdminInput label="Hero EN description" value={content.hero.description.en} onChange={v => update("hero.description.en", v)} textarea /><AdminInput label="Hero RU description" value={content.hero.description.ru} onChange={v => update("hero.description.ru", v)} textarea /></AdminSection><AdminSection title="Contact links"><p className="mb-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-100">The contact section links to Telegram (<code>{telegramHandle}</code>) and Instagram (<code>{instagramHandle}</code>). Change the handles/URLs in <code>telegramUrl</code> / <code>instagramUrl</code> inside <code>app/page.tsx</code>.</p></AdminSection><AdminSection title="About text"><AdminInput label="EN prefix" value={content.about.prefix.en} onChange={v => update("about.prefix.en", v)} /><AdminInput label="RU prefix" value={content.about.prefix.ru} onChange={v => update("about.prefix.ru", v)} /><AdminInput label="EN accent" value={content.about.accent.en} onChange={v => update("about.accent.en", v)} /><AdminInput label="RU accent" value={content.about.accent.ru} onChange={v => update("about.accent.ru", v)} /><AdminInput label="EN body" value={content.about.body.en} onChange={v => update("about.body.en", v)} textarea /><AdminInput label="RU body" value={content.about.body.ru} onChange={v => update("about.body.ru", v)} textarea /></AdminSection><AdminSection title="Creative canvas"><AdminInput label="Always playing showreel" value={content.toolsIntro.canvasShowreel} onChange={v => update("toolsIntro.canvasShowreel", v)} /><AdminInput label="Poster" value={content.toolsIntro.canvasPoster} onChange={v => update("toolsIntro.canvasPoster", v)} /></AdminSection></div><AdminCollectionTools tools={content.tools} setContent={setContent} /><AdminCollectionPeople people={content.collaborators} setContent={setContent} /></div>}</div></motion.div>}</AnimatePresence>;
}
function structuredCloneAndSet<T>(obj: T, path: string, value: unknown): T { const clone = structuredClone(obj); const parts = path.split("."); let cur: any = clone; for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]; cur[parts.at(-1)!] = value; return clone; }
function AdminSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="mb-3 flex items-center gap-2 font-bold"><Pencil className="h-4 w-4" />{title}</h3>{children}</section>; }
function AdminInput({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) { return <label className="mb-3 block text-xs text-[#e1e0cc]/60">{label}{textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/45 p-3 text-sm text-[#e1e0cc]" /> : <input value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/45 p-3 text-sm text-[#e1e0cc]" />}</label>; }
function AdminCollectionTools({ tools, setContent }: { tools: ToolCard[]; setContent: React.Dispatch<React.SetStateAction<SiteContent>> }) { return <AdminSection title="Software / tool cards"><div className="grid gap-3 md:grid-cols-2">{tools.map((tool, i) => <div key={tool.id} className="rounded-xl border border-white/10 p-3"><div className="mb-2 flex justify-between"><b>{tool.title.en}</b><button onClick={() => setContent(p => ({ ...p, tools: p.tools.filter(x => x.id !== tool.id) }))}><Trash2 className="h-4 w-4" /></button></div><AdminInput label="Icon key: ae / blend / brain / spark / cut" value={tool.icon} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.icon`, v as ToolCard["icon"]))} /><AdminInput label="Title EN" value={tool.title.en} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.title.en`, v))} /><AdminInput label="Title RU" value={tool.title.ru} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.title.ru`, v))} /><AdminInput label="Subtitle EN" value={tool.subtitle.en} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.subtitle.en`, v))} textarea /><AdminInput label="Subtitle RU" value={tool.subtitle.ru} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.subtitle.ru`, v))} textarea /><AdminInput label="Checklist EN (one per line)" value={tool.checklist.en.join("\n")} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.checklist.en`, v.split("\n")))} textarea /><AdminInput label="Checklist RU (one per line)" value={tool.checklist.ru.join("\n")} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.checklist.ru`, v.split("\n")))} textarea /><AdminInput label="Poster" value={tool.poster} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.poster`, v))} /><AdminInput label="Hover showreel" value={tool.showreel} onChange={v => setContent(p => structuredCloneAndSet(p, `tools.${i}.showreel`, v))} /></div>)}</div></AdminSection>; }
function AdminCollectionPeople({ people, setContent }: { people: Collaborator[]; setContent: React.Dispatch<React.SetStateAction<SiteContent>> }) { return <AdminSection title="Collaborators"><div className="grid gap-3 md:grid-cols-2">{people.map((p, i) => <div key={p.id} className="rounded-xl border border-white/10 p-3"><div className="mb-2 flex justify-between"><b>{p.name.en}</b><button onClick={() => setContent(c => ({ ...c, collaborators: c.collaborators.filter(x => x.id !== p.id) }))}><Trash2 className="h-4 w-4" /></button></div><AdminInput label="Name EN" value={p.name.en} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.name.en`, v))} /><AdminInput label="Name RU" value={p.name.ru} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.name.ru`, v))} /><AdminInput label="Role EN" value={p.role.en} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.role.en`, v))} /><AdminInput label="Role RU" value={p.role.ru} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.role.ru`, v))} /><AdminInput label="Studio/company" value={p.studio} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.studio`, v))} /><AdminInput label="Bio EN" value={p.bio.en} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.bio.en`, v))} textarea /><AdminInput label="Bio RU" value={p.bio.ru} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.bio.ru`, v))} textarea /><AdminInput label="Image/poster" value={p.image} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.image`, v))} /><AdminInput label="Card showreel" value={p.showreel} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.showreel`, v))} /><AdminInput label="Detail video" value={p.detailVideo} onChange={v => setContent(c => structuredCloneAndSet(c, `collaborators.${i}.detailVideo`, v))} /><AdminInput label="Links JSON" value={JSON.stringify(p.links)} onChange={v => { try { const parsed = JSON.parse(v); setContent(c => structuredCloneAndSet(c, `collaborators.${i}.links`, parsed)); } catch {} }} textarea /></div>)}</div></AdminSection>; }

export default function Home() {
  const [content, setContent] = useSiteContent(); const [lang, setLang] = useLanguage(); const [adminOpen, setAdminOpen] = useState(false);
  useSmoothScroll();
  useEffect(() => { const handler = (e: globalThis.KeyboardEvent) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") setAdminOpen(true); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, []);
  return <main className="relative"><Hero content={content} lang={lang} setLang={setLang} openAdmin={() => setAdminOpen(true)} /><About content={content} lang={lang} /><Tools content={content} lang={lang} /><Collaborators content={content} lang={lang} /><Stats content={content} lang={lang} /><Contact content={content} lang={lang} /><footer className="container flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-10 text-sm text-[#e1e0cc]/45"><span>{lang === "ru" ? "© 2026 alex.creates — кинематографичный монтаж и режиссура." : "© 2026 alex.creates — cinematic editing and direction."}</span><span className="mono text-xs tracking-[.2em] text-[#e1e0cc]/35">v0.2</span></footer><AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} content={content} setContent={setContent} /></main>;
}
