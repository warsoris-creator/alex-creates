export type Lang = "en" | "ru";
export type Localized = Record<Lang, string>;
export type ToolCard = {
  id: string;
  icon: "ae" | "blend" | "brain" | "spark" | "cut";
  title: Localized;
  subtitle: Localized;
  checklist: Record<Lang, string[]>;
  link: string;
  poster: string;
  showreel: string;
};
export type Collaborator = {
  id: string;
  name: Localized;
  role: Localized;
  studio: string;
  bio: Localized;
  image: string;
  showreel: string;
  detailVideo: string;
  links: { label: string; url: string }[];
};
export type SiteContent = {
  nav: Record<Lang, string[]>;
  hero: { title: string; description: Localized; cta: Localized; media: string; poster: string; mediaType: "video" | "image" };
  about: { label: Localized; prefix: Localized; accent: Localized; suffix: Localized; body: Localized };
  toolsIntro: { title: Localized; subtitle: Localized; canvasTitle: Localized; canvasShowreel: string; canvasPoster: string };
  tools: ToolCard[];
  collaboratorsIntro: { eyebrow: Localized; titlePrefix: Localized; titleAccent: Localized; body: Localized };
  collaborators: Collaborator[];
  statsIntro: { eyebrow: Localized; titlePrefix: Localized; titleAccent: Localized; titleSuffix: Localized; body: Localized; cta: Localized; image: string };
  stats: { id: string; value: number; suffix: string; label: Localized; description: Localized }[];
  contact: { eyebrow: Localized; title: Localized; body: Localized; name: Localized; email: Localized; message: Localized; submit: Localized; success: Localized; error: Localized };
};

const videoA = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const videoB = "https://www.w3schools.com/html/mov_bbb.mp4";

export const defaultContent: SiteContent = {
  nav: {
    en: ["Our story", "Collective", "Workshops", "Programs", "Inquiries"],
    ru: ["История", "Команда", "Воркшопы", "Программы", "Заявки"],
  },
  hero: {
    title: "alex.creates*",
    media: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2400&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2200&auto=format&fit=crop",
    mediaType: "image",
    description: {
      en: "alex.creates is a worldwide network of visual artists, filmmakers, and storytellers bound not by place, status, or labels, but by passion and hunger to unlock potential through unique perspectives.",
      ru: "alex.creates — международная сеть визуальных художников, режиссёров и рассказчиков, объединённых не местом, статусом или ярлыками, а страстью и стремлением раскрывать потенциал через уникальный взгляд.",
    },
    cta: { en: "Join the lab", ru: "Войти в лабораторию" },
  },
  about: {
    label: { en: "Visual arts", ru: "Визуальное искусство" },
    prefix: { en: "I am Aleksandr,", ru: "Я Александр," },
    accent: { en: "a self-taught director.", ru: "режиссёр-самоучка." },
    suffix: { en: "I have skills in color grading, visual effects, and narrative design.", ru: "Я работаю с цветокоррекцией, визуальными эффектами и драматургией кадра." },
    body: {
      en: "Over the past years I have explored short films, dream-based promos, commercial stories and atmosphere-driven edits. Together with people around me, I turn raw footage into visual language that feels tactile, patient and alive.",
      ru: "За последние годы я исследовал короткий метр, атмосферные промо, коммерческие истории и монтаж, построенный на ощущениях. Вместе с людьми вокруг я превращаю исходный материал в живой визуальный язык.",
    },
  },
  toolsIntro: {
    title: { en: "Tools that power my process.", ru: "Инструменты моего процесса." },
    subtitle: { en: "Built for pure vision. Powered by art.", ru: "Создано для чистого видения. Движимо искусством." },
    canvasTitle: { en: "Your creative canvas.", ru: "Твой творческий холст." },
    canvasShowreel: videoA,
    canvasPoster: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1100&auto=format&fit=crop",
  },
  tools: [
    {
      id: "after-effects-premiere", icon: "ae",
      title: { en: "After Effects + Premiere Pro.", ru: "After Effects + Premiere Pro." },
      subtitle: { en: "Editorial rhythm, compositing and finishing in one focused pipeline.", ru: "Монтажный ритм, композитинг и финальная сборка в одном пайплайне." },
      checklist: { en: ["Editing, motion graphics, compositing, and visual storytelling", "Cinematic effects, seamless transitions, and dynamic visuals", "The foundation of polished post-production"], ru: ["Монтаж, моушн-графика, композитинг и визуальный сторителлинг", "Кинематографичные эффекты, плавные переходы и динамика", "Фундамент полированной постпродукции"] },
      link: "#contact", poster: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1000&auto=format&fit=crop", showreel: videoB,
    },
    {
      id: "blender", icon: "blend",
      title: { en: "Blender.", ru: "Blender." },
      subtitle: { en: "World-building, lighting and surreal visual inserts.", ru: "Создание миров, свет и сюрреалистичные визуальные вставки." },
      checklist: { en: ["3D modeling, animation, lighting and rendering", "Creating immersive worlds and detailed visual assets", "Bringing ideas to life in three dimensions"], ru: ["3D-моделирование, анимация, свет и рендер", "Иммерсивные миры и детальные визуальные ассеты", "Идеи, оживающие в трёх измерениях"] },
      link: "#contact", poster: "https://images.unsplash.com/photo-1633287389546-54c2a1a4ad49?q=80&w=1000&auto=format&fit=crop", showreel: videoA,
    },
    {
      id: "neural-networks", icon: "brain",
      title: { en: "Neural Networks.", ru: "Нейросети." },
      subtitle: { en: "Experimental acceleration for ideas that need a new texture.", ru: "Экспериментальное ускорение для идей, которым нужна новая фактура." },
      checklist: { en: ["AI tools for enhancing creativity and efficiency", "Innovative solutions for upscaling, restoration, and generation", "Pushing the boundaries of possibilities with AI"], ru: ["AI-инструменты для усиления креативности и скорости", "Апскейл, реставрация и генеративные решения", "Расширение границ возможного с помощью AI"] },
      link: "#contact", poster: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop", showreel: videoB,
    },
  ],
  collaboratorsIntro: {
    eyebrow: { en: "Collaborators", ru: "Коллаборации" },
    titlePrefix: { en: "People I’ve", ru: "Люди, с которыми я" },
    titleAccent: { en: "worked with.", ru: "работал." },
    body: { en: "Over the years, I’ve collaborated with talented filmmakers, studios, and brands to create meaningful stories and visuals that connect.", ru: "За годы работы я сотрудничал с режиссёрами, студиями и брендами, чтобы создавать истории и визуальные миры, которые находят отклик." },
  },
  collaborators: [
    { id: "philipp", name: { en: "Philipp Straetcker", ru: "Филипп Штреткер" }, role: { en: "Director", ru: "Режиссёр" }, studio: "PARALLAX", bio: { en: "A director focused on emotionally grounded cinematic campaigns and patient visual rhythm.", ru: "Режиссёр, работающий с эмоциональными кинематографичными кампаниями и точным визуальным ритмом." }, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop", showreel: videoA, detailVideo: videoA, links: [{ label: "Instagram", url: "https://instagram.com/" }, { label: "Website", url: "https://example.com" }] },
    { id: "anais", name: { en: "Anaïs Bonnet", ru: "Анаис Бонне" }, role: { en: "Producer", ru: "Продюсер" }, studio: "NOTE STUDIO", bio: { en: "Producer connecting intimate documentary tone with elevated commercial execution.", ru: "Продюсер, объединяющий документальную интимность с премиальным коммерческим исполнением." }, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop", showreel: videoB, detailVideo: videoB, links: [{ label: "Instagram", url: "https://instagram.com/" }] },
    { id: "jonas", name: { en: "Jonas Frei", ru: "Йонас Фрай" }, role: { en: "DP / Cinematographer", ru: "Оператор-постановщик" }, studio: "FREI FILMS", bio: { en: "Cinematographer using warm natural light, handheld movement and measured contrast.", ru: "Оператор, работающий с тёплым естественным светом, ручной камерой и выверенным контрастом." }, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop", showreel: videoA, detailVideo: videoA, links: [{ label: "Website", url: "https://example.com" }] },
    { id: "luca", name: { en: "Luca Merli", ru: "Лука Мерли" }, role: { en: "Editor", ru: "Монтажёр" }, studio: "CUTWORKS", bio: { en: "Editor shaping sharp pacing, tactile transitions and clean delivery systems.", ru: "Монтажёр, выстраивающий ритм, тактильные переходы и чистую систему сдачи проектов." }, image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&auto=format&fit=crop", showreel: videoB, detailVideo: videoB, links: [{ label: "Instagram", url: "https://instagram.com/" }] },
    { id: "nico", name: { en: "Nico Aigner", ru: "Нико Айгнер" }, role: { en: "Colorist", ru: "Колорист" }, studio: "BASELIGHT", bio: { en: "Colorist building soft warmth, rich blacks and restrained commercial polish.", ru: "Колорист, создающий мягкое тепло, глубокий чёрный и сдержанный коммерческий лоск." }, image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?q=80&w=1000&auto=format&fit=crop", showreel: videoA, detailVideo: videoA, links: [{ label: "Website", url: "https://example.com" }] },
    { id: "maria", name: { en: "Maria Keller", ru: "Мария Келлер" }, role: { en: "VFX Artist", ru: "VFX-художник" }, studio: "PIXOMONDO", bio: { en: "VFX artist blending invisible fixes with poetic visual interventions.", ru: "VFX-художник, соединяющий незаметные исправления с поэтичными визуальными решениями." }, image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop", showreel: videoB, detailVideo: videoB, links: [{ label: "Instagram", url: "https://instagram.com/" }] },
    { id: "david", name: { en: "David Lenz", ru: "Давид Ленц" }, role: { en: "Sound Designer", ru: "Саунд-дизайнер" }, studio: "SOUNDBED", bio: { en: "Sound designer crafting dense atmospheres, signature hits and cinematic silence.", ru: "Саунд-дизайнер, создающий плотные атмосферы, акценты и кинематографичную тишину." }, image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1000&auto=format&fit=crop", showreel: videoA, detailVideo: videoA, links: [{ label: "Website", url: "https://example.com" }] },
    { id: "tobias", name: { en: "Tobias Brandt", ru: "Тобиас Брандт" }, role: { en: "Music Composer", ru: "Композитор" }, studio: "BRANDT AUDIO", bio: { en: "Composer pairing analog warmth with restrained modern tension.", ru: "Композитор, соединяющий аналоговое тепло со сдержанным современным напряжением." }, image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&auto=format&fit=crop&sat=-40", showreel: videoB, detailVideo: videoB, links: [{ label: "Instagram", url: "https://instagram.com/" }] },
  ],
  statsIntro: {
    eyebrow: { en: "By the numbers", ru: "В цифрах" },
    titlePrefix: { en: "My work,", ru: "Моя работа," },
    titleAccent: { en: "by the", ru: "в" },
    titleSuffix: { en: "numbers.", ru: "цифрах." },
    body: { en: "A quick look at the journey so far. Each number represents stories, people, and passion.", ru: "Короткий взгляд на путь. За каждой цифрой — истории, люди и вовлечённость." },
    cta: { en: "Let’s create together", ru: "Создадим вместе" },
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop",
  },
  stats: [
    { id: "years", value: 8, suffix: "+", label: { en: "Years of Experience", ru: "Лет опыта" }, description: { en: "Working on creative projects across short-form, branded, and emerging media.", ru: "Креативные проекты: короткий формат, бренды и новые медиа." } },
    { id: "projects", value: 60, suffix: "+", label: { en: "Projects Completed", ru: "Завершённых проектов" }, description: { en: "From short films to commercials, music videos and experimental pieces.", ru: "От короткого метра до рекламы, клипов и экспериментов." } },
    { id: "collabs", value: 25, suffix: "+", label: { en: "Trusted Collaborators", ru: "Надёжных коллабораций" }, description: { en: "Directors, studios, and creative minds I’ve had the honor to work alongside.", ru: "Режиссёры, студии и авторы, с которыми было ценно работать." } },
    { id: "countries", value: 12, suffix: "+", label: { en: "Countries", ru: "Стран" }, description: { en: "Projects that took me around the world and shaped my perspective.", ru: "Проекты по миру, сформировавшие мой взгляд." } },
  ],
  contact: {
    eyebrow: { en: "Inquiries", ru: "Заявки" },
    title: { en: "Tell me what you are building.", ru: "Расскажите, что вы создаёте." },
    body: { en: "Send a brief, a loose thought, or a half-formed visual dream. I’ll reply with the next practical step.", ru: "Отправьте бриф, набросок идеи или ещё неоформленное визуальное ощущение. Я отвечу следующим практическим шагом." },
    name: { en: "Name", ru: "Имя" }, email: { en: "Email", ru: "Email" }, message: { en: "Project / message", ru: "Проект / сообщение" }, submit: { en: "Send inquiry", ru: "Отправить заявку" }, success: { en: "Inquiry sent. Aleksandr will receive the note.", ru: "Заявка отправлена. Александр получит сообщение." }, error: { en: "Could not send right now. Check settings or try again.", ru: "Не удалось отправить. Проверьте настройки или попробуйте ещё раз." },
  },
};

export const storageKey = "alex.creates.content.v1";
export const languageKey = "alex.creates.lang";
