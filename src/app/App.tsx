import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight, X, Music2,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────

const TIMELINE = [
  { year: "2018", title: "The Beginning", desc: "Where two worlds quietly touched for the first time a meeting written in something older than coincidence." },
  { year: "2019", title: "Growing Roots", desc: "Every season planted something new between us. Laughter found easy ground." },
  { year: "2020", title: "Shelter in the Storm", desc: "When the world grew uncertain, we became each other's steadiest thing." },
  { year: "2021", title: "A Golden Chapter", desc: "Moments that refused to be forgotten. We collected them without meaning to." },
  { year: "2022", title: "Deeper Waters", desc: "Understanding that moved beyond language. Something quieter, more enduring." },
  { year: "2023", title: "Still Here", desc: "Some things persist because they were always real not because they were easy." },
  { year: "2024", title: "Gratitude", desc: "For every laugh, every silence, every shared sky. For all of it." },
  { year: "2025", title: "Always", desc: "This story does not need an ending. It simply continues, in different light." },
];

const QUOTES = [
  { text: "You have always been my favorite chapter.", attr: "Alpha" },
  { text: "Some people become memories. You became home.", attr: "" },
  { text: "The moon still remembers the sky.", attr: "" },
  { text: "There are places in the heart that only you have mapped.", attr: "Alpha" },
  { text: "Every beautiful thing I have ever known carries your reflection.", attr: "Alpha" },
];

const shuffle = <T,>(items: T[]) => items.slice().sort(() => Math.random() - 0.5);

const fileNameToLabel = (name: string) =>
  name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

type AssetMap = Record<string, string>;

const imageModules = (import.meta as any).glob("../imgs/*.{jpg,jpeg,png,webp,gif}", { eager: true, query: "?url", import: "default" }) as AssetMap;
const videoModules = (import.meta as any).glob("../vids/*.{mp4,webm}", { eager: true, query: "?url", import: "default" }) as AssetMap;
const audioModules = (import.meta as any).glob("../audio/*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" }) as AssetMap;

const GALLERY = shuffle(
  Object.entries(imageModules).map(([path, src]) => {
    const fileName = path.split("/").pop() ?? path;
    return {
      id: fileName,
      src,
      alt: fileNameToLabel(fileName),
      caption: fileNameToLabel(fileName),
    };
  })
);

const VIDEOS = shuffle(
  Object.entries(videoModules).map(([path, src]) => {
    const fileName = path.split("/").pop() ?? path;
    return {
      id: fileName,
      src,
      label: fileNameToLabel(fileName),
    };
  })
);

// Add your audio track URL here
const MUSIC_URL = Object.values(audioModules)[0] || "";

// ─── Star field canvas ─────────────────────────────────────────────────────

function StarField({ density = 180 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const stars = Array.from({ length: density }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.002,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.phase += s.speed;
        const a = 0.1 + 0.35 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ─── Scroll reveal wrapper ─────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Gold divider ──────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div className="flex items-center gap-4 my-10">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/40" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70" />
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/40" />
    </div>
  );
}

// ─── Music player ──────────────────────────────────────────────────────────

function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !MUSIC_URL) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <audio ref={audioRef} src={MUSIC_URL} loop />
      <motion.div
        className="bg-[#0D1117]/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-2xl shadow-2xl overflow-hidden"
        animate={{ width: expanded ? 260 : "auto" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[#D4AF37] hover:text-[#F7F3EC] transition-colors"
            aria-label="Toggle music player"
          >
            <Music2 size={15} />
          </button>

          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#F7F3EC]/45 text-xs tracking-wide flex-1 truncate font-light"
            >
              {MUSIC_URL ? "For Hawa — Ambient" : "Add audio via MUSIC_URL"}
            </motion.span>
          )}

          <button
            onClick={toggle}
            className="text-[#D4AF37] hover:text-[#F7F3EC] transition-colors"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setMuted((m) => !m)}
                className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 h-1 accent-[#D4AF37]"
                aria-label="Volume"
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Navigation ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", id: "s-home" },
  { label: "Our Story", id: "s-story" },
  { label: "Gallery", id: "s-gallery" },
  { label: "Letters", id: "s-letters" },
  { label: "Memories", id: "s-memories" },
  { label: "Wishes", id: "s-wishes" },
  { label: "Forever", id: "s-forever" },
];

function FloatingNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 pt-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#0D1117]/70 backdrop-blur-2xl border border-[#D4AF37]/12 rounded-2xl px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => go("s-home")}
            className="font-['Playfair_Display'] text-[#D4AF37] text-sm tracking-[0.18em] uppercase"
          >
            Alpha × Luna
          </button>

          <div className="hidden md:flex items-center gap-5">
            {NAV_ITEMS.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`text-[10px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                  active === n.id
                    ? "text-[#D4AF37]"
                    : "text-[#F7F3EC]/40 hover:text-[#F7F3EC]/75"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          <button
            className="md:hidden flex flex-col gap-[5px] p-1"
            onClick={() => setOpen((o) => !o)}
            aria-label="Open menu"
          >
            <span className={`block h-px w-5 bg-[#F7F3EC]/55 transition-transform origin-center ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block h-px w-5 bg-[#F7F3EC]/55 transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-px w-5 bg-[#F7F3EC]/55 transition-transform origin-center ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="mt-2 bg-[#0D1117]/90 backdrop-blur-2xl border border-[#D4AF37]/12 rounded-2xl py-4 px-5 flex flex-col gap-4"
            >
              {NAV_ITEMS.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className="text-left text-xs tracking-[0.18em] uppercase text-[#F7F3EC]/55 hover:text-[#D4AF37] transition-colors"
                >
                  {n.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function HeroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0D1117]">
      <StarField density={220} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_65%_at_50%_50%,rgba(212,175,55,0.07)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <motion.p
          className="text-[#D4AF37]/55 text-[10px] tracking-[0.55em] uppercase mb-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          A gift, crafted with love
        </motion.p>

        <motion.h1
          className="font-['Playfair_Display'] text-[#F7F3EC] text-5xl md:text-7xl lg:text-[88px] font-normal leading-[1.08] mb-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        >
          Happy Birthday
        </motion.h1>

        <motion.h2
          className="font-['Playfair_Display'] italic text-[#D4AF37] text-3xl md:text-5xl lg:text-6xl font-normal mb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        >
          Hawa Abdalla
        </motion.h2>

        <motion.div
          className="space-y-1 mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.1, duration: 1 }}
        >
          {['"To my Hawa.', "To my Luna.", 'From your Alpha."'].map((line) => (
            <p key={line} className="font-['Playfair_Display'] italic text-[#F7F3EC]/40 text-base md:text-lg">
              {line}
            </p>
          ))}
        </motion.div>

        <motion.button
          onClick={onStart}
          className="group relative px-12 py-4 border border-[#D4AF37]/35 text-[#D4AF37] text-[10px] tracking-[0.45em] uppercase overflow-hidden transition-all duration-500 hover:border-[#D4AF37]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.7, duration: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="absolute inset-0 bg-[#D4AF37] -translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          <span className="relative group-hover:text-[#0D1117] transition-colors duration-300">
            Begin Our Story
          </span>
        </motion.button>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0D1117] to-transparent pointer-events-none" />
    </div>
  );
}

// ─── Home intro ────────────────────────────────────────────────────────────

function HomeSection() {
  return (
    <section id="s-home" className="relative min-h-screen flex items-center justify-center py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_42%,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-8">Since 2018</p>
        </Reveal>
        <Reveal delay={0.12}>
          <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-6xl font-normal leading-[1.15] mb-8">
            A memory preserved
            <br />
            <em className="text-[#D4AF37]">in light</em>
          </h2>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="text-[#F7F3EC]/45 text-lg font-light leading-loose max-w-xl mx-auto font-['Manrope']">
            This is not a website. It is a birthday gift for you. Every detail is meant to honor the story that began in 2018,
            with care for the years we have shared and the hope that still lives quietly in me.
          </p>
        </Reveal>
        <Reveal delay={0.36}>
          <GoldDivider />
        </Reveal>
      </div>
    </section>
  );
}

// ─── Our Story ─────────────────────────────────────────────────────────────

function StorySection() {
  return (
    <section id="s-story" className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="text-center mb-24">
            <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-5">Chapter by Chapter</p>
            <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-5xl font-normal">Our Story</h2>
          </div>
        </Reveal>

        <div className="relative">
          <div className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/22 to-transparent md:-translate-x-px" />

          {TIMELINE.map((item, i) => (
            <Reveal key={item.year} delay={Math.min(i * 0.07, 0.4)}>
              <div className={`relative flex items-start mb-14 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className="hidden md:block flex-1" />

                <div className="absolute left-[14px] md:left-1/2 top-3 md:-translate-x-[6px] w-3 h-3 rounded-full border border-[#D4AF37]/45 bg-[#0D1117] z-10 flex items-center justify-center">
                  <div className="w-[5px] h-[5px] rounded-full bg-[#D4AF37]/50" />
                </div>

                <div className="flex-1 ml-12 md:ml-0 bg-[#111827]/70 backdrop-blur-sm border border-[#D4AF37]/10 rounded-2xl p-6 hover:border-[#D4AF37]/20 transition-colors duration-500">
                  <span className="font-['Playfair_Display'] text-[#D4AF37] text-2xl">{item.year}</span>
                  <h3 className="font-['Playfair_Display'] text-[#F7F3EC] text-xl mt-1 mb-3">{item.title}</h3>
                  <p className="text-[#F7F3EC]/42 text-sm font-light leading-relaxed font-['Manrope']">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Personalized storytelling ─────────────────────────────────────────────

function PersonalizedStorySection() {
  return (
    <section id="s-personalized" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-24">
            <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-5">
              Personalized Storytelling
            </p>
            <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-5xl font-normal">
              A birthday gift for you, Hawa
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-8">
          <Reveal>
            <div className="bg-[#111827]/70 border border-[#D4AF37]/15 rounded-3xl p-8 backdrop-blur-sm">
              <p className="text-[#D4AF37] text-[11px] uppercase tracking-[0.45em] mb-4">Since 2018</p>
              <h3 className="font-['Playfair_Display'] text-[#F7F3EC] text-2xl mb-4">Where our story began</h3>
              <p className="text-[#F7F3EC]/55 leading-relaxed font-['Manrope']">
                In 2018, an ordinary day shifted into something that would carry forward
                for years. I remember the first time you stepped into my life the way the
                moment was not dramatic but quietly certain. The name Luna began to settle
                into my memory as a presence that felt steady, true and entirely her.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="bg-[#111827]/70 border border-[#D4AF37]/15 rounded-3xl p-8 backdrop-blur-sm">
              <p className="text-[#D4AF37] text-[11px] uppercase tracking-[0.45em] mb-4">The years between</p>
              <h3 className="font-['Playfair_Display'] text-[#F7F3EC] text-2xl mb-4">Everyday grace and growth</h3>
              <p className="text-[#F7F3EC]/55 leading-relaxed font-['Manrope']">
                Between the laughter and the long conversations there have been lessons learned
                together and moments when the quiet felt as meaningful as the celebration.
                The work we did to keep understanding one another, the respect given in hard
                moments is the kind of love that feels more like friendship than a performance.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="bg-[#111827]/70 border border-[#D4AF37]/15 rounded-3xl p-8 backdrop-blur-sm">
              <p className="text-[#D4AF37] text-[11px] uppercase tracking-[0.45em] mb-4">This birthday gift</p>
              <h3 className="font-['Playfair_Display'] text-[#F7F3EC] text-2xl mb-4">An honest story, softly told</h3>
              <p className="text-[#F7F3EC]/55 leading-relaxed font-['Manrope']">
                This site is a birthday gift for you. It is not a collection of
                images alone. It is an honest record of how you became part of my life
                and how I still holds the hope that the future can include the two of us
                choosing one another again day after day.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Gallery ───────────────────────────────────────────────────────────────

function GallerySection() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = useCallback(() => setLightbox((l) => l !== null ? (l - 1 + GALLERY.length) % GALLERY.length : null), []);
  const next = useCallback(() => setLightbox((l) => l !== null ? (l + 1) % GALLERY.length : null), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next]);

  return (
    <section id="s-gallery" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
            <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-5">Preserved Moments</p>
            <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-5xl font-normal">Gallery</h2>
          </div>
        </Reveal>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {GALLERY.map((img, i) => (
            <Reveal key={img.id} delay={Math.min(i * 0.06, 0.35)} className="break-inside-avoid">
              <div
                className="relative group overflow-hidden rounded-xl cursor-pointer bg-[#111827]"
                onClick={() => setLightbox(i)}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                  <p className="font-['Playfair_Display'] italic text-[#F7F3EC] text-xs tracking-wide">
                    {img.caption}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1117]/96 backdrop-blur-xl px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              className="relative max-w-4xl w-full"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={GALLERY[lightbox].src}
                alt={GALLERY[lightbox].alt}
                className="w-full rounded-2xl"
                style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}
              />
              <p className="font-['Playfair_Display'] italic text-[#F7F3EC]/60 text-xl text-center mt-5">
                {GALLERY[lightbox].caption}
              </p>

              <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 bg-[#0D1117]/80 text-[#F7F3EC]/55 hover:text-[#F7F3EC] rounded-full p-2 transition-colors" aria-label="Close">
                <X size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-[#0D1117]/70 text-[#F7F3EC]/55 hover:text-[#F7F3EC] rounded-full p-3 transition-colors" aria-label="Previous">
                <ChevronLeft size={22} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0D1117]/70 text-[#F7F3EC]/55 hover:text-[#F7F3EC] rounded-full p-3 transition-colors" aria-label="Next">
                <ChevronRight size={22} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Love letter ───────────────────────────────────────────────────────────

function LettersSection() {
  return (
    <section id="s-letters" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-5">
              Love Letter & Personal Message
            </p>
            <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-5xl font-normal">
               With all my care
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <motion.div
            className="relative bg-[#F7F3EC] rounded-2xl p-9 md:p-14"
            style={{ boxShadow: "0 0 0 1px rgba(212,175,55,0.22), 0 50px 100px rgba(0,0,0,0.6)" }}
            whileInView={{ y: [20, 0] }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-3 left-3 w-8 h-8 border-t border-l border-[#D4AF37]/50" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t border-r border-[#D4AF37]/50" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b border-l border-[#D4AF37]/50" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b border-r border-[#D4AF37]/50" />

            <p className="font-['Playfair_Display'] italic text-2xl mb-10 text-[#1F1F1F]/70">
              My Dearest Hawa,
            </p>

            <div className="space-y-6 text-[#1F1F1F]/62 leading-relaxed font-light text-[16px] font-['Manrope']">
              <p>
                Happy Birthday. This website is the birthday gift I wanted to make for you a place where the years we have shared since 2018 are visible
                held with care. I write it because some things are worth saying clearly even
                when they are simple.
              </p>

              <p>
                I am grateful for every year we have had together. From the first moments of
                knowing one another through quiet conversations and small kindnesses, to the
                times we laughed until we could not breathe each year added a new layer of
                understanding. Those years are not easy to describe but I do not want them to
                be forgotten.
              </p>

              <p>
                There were days when your laughter filled a room and days when we barely spoke.
                There were moments when I felt certain of everything and moments when I was
                learning how to carry my own doubts with gentleness. Through it all you
                became the person I trust in my heart more than anyone else.
              </p>

              <p>
                I know that life has become uncertain. I know that our paths are not as close
                as they once were. I am not writing this to ask for explanations or to place
                blame. I am writing because I remain grateful for the time we shared and I
                want you to know the way that feeling has stayed with me.
              </p>

              <p>
                I have thought often about the ways we grew together and the ways we grew apart.
                Some of those changes happened quietly and some of them were loud enough to be
                impossible to ignore. That does not change the truth of what I felt. I still
                respect you deeply and I still care for you without condition.
              </p>

              <p>
                My love for you is not dramatic or dependent on what happens next. It is real,
                patient and quiet. It is the kind of love that is willing to wait, that is
                willing to accept the present as it is while still holding a steady belief in
                what you have meant to me.
              </p>

              <p>
                Among all the possible futures I have imagined you have always been the one I
                saw beside me. In the middle of my plans in the spaces where I am honest with
                myself it is always you. I am not saying this from desperation. I am saying it
                because it is the clearest thing I have ever known.
              </p>

              <p>
                I still hope to marry you one day. That hope is not a demand. It is not a way
                to make you feel responsible. It is a quiet truth: of everyone I have ever
                imagined building a life with you are the only woman I still see as my
                partner in the truest sense.
              </p>

              <p>
                When I think of marriage, I do not think of it as a fantasy or a prize. I think
                of it as a lifelong partnership. I think of loyalty that is chosen every day.
                I think of friendship that remains steady when the world shifts. I think of
                faith in one another, the kind of laughter that feels familiar and the ability
                to grow together without losing ourselves.
              </p>

              <p>
                I want a marriage that is honest, where we can be open about our fears and still
                choose each other. I want us to be teammates, friends and safe places for one
                another. I want a future where we continue learning where we continue holding
                one another’s hands through ordinary mornings and hard afternoons alike.
              </p>

              <p>
                There is no pressure in this letter. There is only the wish that you know how
                deeply valued you are. Whether the years ahead keep us close or take us in
                different directions, you will always be one of the greatest blessings I have
                ever received.
              </p>

              <p>
                I hope the life you choose is full of peace and kindness. I hope you feel
                celebrated today not only because it is your birthday but because you are the
                kind of person who deserves to be seen clearly and held with respect.
              </p>

              <p>
                If the future brings us back together I would be grateful beyond words. If it
                does not I will still carry this time with me as one of the most cherished
                chapters. I do not want you to feel obligated. I want you to feel loved.
              </p>

              <p>
                Thank you for everything you have given me for the kindness, the patience
                and the moments that have stayed with me. Thank you for being Luna in my sky
                and Hawa in my most honest thoughts.
              </p>

              <p>
                Happy birthday, Hawa (my Luna). May this year bring you warmth, strength and the kind
                of happiness that feels steady. Know that you are admired, respected and
                deeply loved.
              </p>
            </div>

            <div className="mt-12 text-right">
              <p className="font-['Playfair_Display'] italic text-[#1F1F1F]/48">
                With gentle certainty,
              </p>
              <p className="font-['Playfair_Display'] text-[#D4AF37] text-2xl mt-2">Alpha</p>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Rotating quotes ────────────────────────────────────────────────────────

function QuotesSection() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <div className="relative h-52 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                className="absolute text-center px-4"
              >
                <p className="font-['Playfair_Display'] italic text-[#F7F3EC] text-2xl md:text-3xl leading-relaxed mb-5">
                  &ldquo;{QUOTES[idx].text}&rdquo;
                </p>
                {QUOTES[idx].attr && (
                  <p className="text-[#D4AF37]/45 text-[10px] tracking-[0.35em] uppercase">
                    — {QUOTES[idx].attr}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="flex justify-center gap-2 mt-4">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full bg-[#D4AF37] transition-all duration-400 ${i === idx ? "w-7 opacity-75" : "w-1.5 opacity-18"}`}
                aria-label={`Quote ${i + 1}`}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Video memories ─────────────────────────────────────────────────────────

function MemoriesSection() {
  return (
    <section id="s-memories" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
            <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-5">In Motion</p>
            <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-5xl font-normal">Memories</h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {VIDEOS.map((v, i) => (
            <Reveal key={v.id} delay={Math.min(i * 0.06, 0.35)}>
              <div className="relative group overflow-hidden rounded-xl bg-[#111827] aspect-[9/16]">
                <video
                  src={v.src}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/75 via-[#0D1117]/20 to-transparent flex items-end p-4">
                  <div>
                    <div className="w-8 h-8 rounded-full border border-[#D4AF37]/45 flex items-center justify-center mb-3 group-hover:border-[#D4AF37]/70 transition-colors">
                      <Play size={10} className="text-[#D4AF37] ml-0.5" />
                    </div>
                    <p className="font-['Playfair_Display'] italic text-[#F7F3EC]/60 text-sm">{v.label}</p>
                    <p className="text-[#F7F3EC]/28 text-[10px] font-light mt-0.5 font-['Manrope']">Video from local assets</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Birthday wishes ────────────────────────────────────────────────────────

function WishesSection() {
  return (
    <section id="s-wishes" className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <p className="text-[#D4AF37]/50 text-[10px] tracking-[0.55em] uppercase mb-8">June 18, 2026</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-5xl md:text-7xl font-normal mb-3 leading-[1.1]">
            Happy Birthday,
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <h3 className="font-['Playfair_Display'] italic text-[#D4AF37] text-4xl md:text-6xl font-normal mb-16">
            Hawa Abdalla
          </h3>
        </Reveal>
        <Reveal delay={0.3}>
          <GoldDivider />
        </Reveal>
        <Reveal delay={0.4}>
          <div className="space-y-6 text-[#F7F3EC]/48 font-light leading-loose text-lg font-['Manrope']">
            <p>
              May this year bring you everything your heart quietly hopes for.
              May you wake each morning feeling worthy of every beautiful thing that finds you.
            </p>
            <p>
              May your laughter be effortless. May your days carry ease.
              May you be surrounded by people who see you fully and love you because of it,
              not despite it.
            </p>
            <p>
              You have always deserved the very best this world has to offer.
              On your birthday and always, I hope it finds you.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Forever / closing ─────────────────────────────────────────────────────

function ForeverSection() {
  return (
    <section id="s-forever" className="relative min-h-screen flex flex-col items-center justify-center py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117] via-[#080F1A] to-[#050810] pointer-events-none" />
      <StarField density={250} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_50%,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <Reveal>
          <p className="text-[#D4AF37]/30 text-[9px] tracking-[0.65em] uppercase mb-20">
            Always and forever, infinity.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <h2 className="font-['Playfair_Display'] text-[#F7F3EC] text-4xl md:text-6xl font-normal leading-[1.3] mb-8">
            No matter where life leads us,
            <br />
            <em className="text-[#F7F3EC]/55">thank you</em> for every
            <br />
            beautiful memory.
          </h2>
        </Reveal>
        <Reveal delay={0.3}>
          <GoldDivider />
        </Reveal>
        <Reveal delay={0.42}>
          <div className="space-y-1 mt-6">
            <p className="text-[#F7F3EC]/38 font-light font-['Manrope']">Happy Birthday,</p>
            <p className="font-['Playfair_Display'] italic text-[#D4AF37] text-4xl">Luna</p>
            <div className="pt-5 space-y-1">
              <p className="text-[#F7F3EC]/32 font-light font-['Manrope']">Always,</p>
              <p className="font-['Playfair_Display'] text-[#F7F3EC] text-3xl">Alpha</p>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.65} className="relative z-10 mt-28 text-center">
        <p className="text-[#D4AF37]/22 text-[9px] tracking-[0.55em] uppercase">Since 2018</p>
        <p className="text-[#F7F3EC]/14 text-[9px] tracking-[0.4em] mt-1">Alpha × Luna</p>
      </Reveal>
    </section>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState("s-home");

  useEffect(() => {
    if (!started) return;
    const ids = NAV_ITEMS.map((n) => n.id);
    const observers = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { threshold: 0.25 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, [started]);

  if (!started) {
    return <HeroScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div className="bg-[#0D1117] min-h-screen overflow-x-hidden">
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.4); }
      `}</style>

      <FloatingNav active={active} />
      <HomeSection />
      <StorySection />
      <PersonalizedStorySection />
      <GallerySection />
      <LettersSection />
      <QuotesSection />
      <MemoriesSection />
      <WishesSection />
      <ForeverSection />
      <MusicPlayer />
    </div>
  );
}
