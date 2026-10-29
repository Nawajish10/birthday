/**
 * Read & Study Curated Data Model & Helpers
 * Dedicated literary sanctuary curated for Meerah's Birthday.
 * Supporting 12 Genres, 8 Reading Presentation Templates, Chapter Progression,
 * Bookmarking, and Reading Progress Persistence.
 */

export interface Genre {
  id: string;
  name: string;
  nameUrdu?: string;
  icon: string;
  description: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  quote?: string;
  speaker?: string;
  illustrationNotes?: string;
}

export interface Book {
  id: string;
  title: string;
  titleUrdu?: string;
  author: string;
  genreId: string;
  description: string;
  coverColor: string;
  coverAccent: string;
  coverSymbol: string;
  pageCount: number;
  ratingRationale: string;
  readingSource?: string;
  sampleExcerpt?: string;
  isFeatured?: boolean;
  publishedYear?: number;
  tags?: string[];
  chapters?: Chapter[];
  studyNotes?: string[];
  keyQuotes?: string[];
}

export type ReadingTemplateId =
  | "minimal"
  | "romantic-journal"
  | "manga-panels"
  | "anime-story"
  | "graphic-novel"
  | "bookshelf"
  | "notes-workspace"
  | "study-cards";

export interface ReadingTemplate {
  id: ReadingTemplateId;
  name: string;
  icon: string;
  description: string;
}

export const READING_TEMPLATES: ReadingTemplate[] = [
  {
    id: "minimal",
    name: "Minimal",
    icon: "📄",
    description: "Distraction-free clean reading typography with generous whitespace and soft focus.",
  },
  {
    id: "romantic-journal",
    name: "Romantic Literary Journal",
    icon: "📜",
    description: "Parchment texture, elegant serif prose, cursive headers, and floral ornaments.",
  },
  {
    id: "manga-panels",
    name: "Manga-Inspired Panel Layout",
    icon: "🗯️",
    description: "Right-to-left panels, screentone shading, action lines, and dialogue bubbles.",
  },
  {
    id: "anime-story",
    name: "Anime-Inspired Illustrated Story",
    icon: "✨",
    description: "Visual novel aesthetic with character nameplate, portrait frame, and animated text cards.",
  },
  {
    id: "graphic-novel",
    name: "Graphic Novel Layout",
    icon: "💥",
    description: "Dynamic color-blocked comic cells, bold captions, and expressive sound-effect badges.",
  },
  {
    id: "bookshelf",
    name: "Bookshelf",
    icon: "📚",
    description: "Rich wooden library shelves with embossed spines, ribbon bookmarks, and volume weights.",
  },
  {
    id: "notes-workspace",
    name: "Notes Workspace",
    icon: "📝",
    description: "Split-view study sanctuary with margin notes, highlighter toggles, and reflection cards.",
  },
  {
    id: "study-cards",
    name: "Study Cards",
    icon: "🃏",
    description: "Interactive flashcard mode summarizing key takeaways, concepts, and cherished quotes.",
  },
];

export const STUDY_GENRES: Genre[] = [
  {
    id: "fiction",
    name: "Fiction",
    nameUrdu: "ادب و فکشن",
    icon: "📖",
    description: "Enduring classic narratives, evocative prose, and philosophical journeys of the heart.",
  },
  {
    id: "romance",
    name: "Romance",
    nameUrdu: "محبت اور داستان",
    icon: "🌸",
    description: "Tender emotions, heartwarming journeys, and classic romances written with wit and passion.",
  },
  {
    id: "mystery-thriller",
    name: "Mystery & Thriller",
    nameUrdu: "پراسرار سسپنس",
    icon: "🔍",
    description: "Clever deductive puzzles, detective mysteries, and suspenseful plot twists to test sharp minds.",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    nameUrdu: "جادوئی فینٹسی",
    icon: "🔮",
    description: "Enchanted worlds, mythical creatures, midnight circuses, and breathtaking magic.",
  },
  {
    id: "sci-fi",
    name: "Sci-Fi",
    nameUrdu: "سائنس فکشن و کائنات",
    icon: "🚀",
    description: "Cosmic journeys, interstellar wonders, and thought experiments on technology and humanity.",
  },
  {
    id: "biography",
    name: "Biography",
    nameUrdu: "سوانح حیات",
    icon: "🖋️",
    description: "Remarkable real lives, resilient memoirs, and inspiring personal memoirs.",
  },
  {
    id: "self-development",
    name: "Self-Development",
    nameUrdu: "ذاتی تعمیر و بصیرت",
    icon: "🌱",
    description: "Gentle wisdom, daily affirmations, and nurturing habits for an intentional life.",
  },
  {
    id: "history-philosophy",
    name: "History & Philosophy",
    nameUrdu: "تاریخ اور فلسفہ",
    icon: "🏛️",
    description: "Timeless stoic reflections, historical wisdom, and deep inquiries into meaning.",
  },
  {
    id: "manga",
    name: "Manga",
    nameUrdu: "مانگا جاپانی",
    icon: "🗯️",
    description: "Captivating Japanese sequential art, heartfelt slice-of-life, and supernatural epics.",
  },
  {
    id: "anime-inspired",
    name: "Anime-Inspired Stories",
    nameUrdu: "اینیمے سے متاثر کہانیاں",
    icon: "✨",
    description: "Cinematic, emotional visual novel narratives, letter writing, and magical realism.",
  },
  {
    id: "comics-graphic-novels",
    name: "Comics/Graphic Novels",
    nameUrdu: "گرافک ناولز و کامکس",
    icon: "💥",
    description: "Vibrant illustrated storytelling, graphic memoirs, modern mythology, and visual warmth.",
  },
  {
    id: "poetry",
    name: "Poetry",
    nameUrdu: "شاعری و غزل",
    icon: "🪶",
    description: "Sublime verses, Urdu ghazals, philosophical Nazms, and contemporary heartfelt stanzas.",
  },
];

export const STUDY_BOOKS: Book[] = [
  // 1. Fiction - The Little Prince
  {
    id: "book-the-little-prince",
    title: "The Little Prince (Le Petit Prince)",
    author: "Antoine de Saint-Exupéry",
    genreId: "fiction",
    description:
      "A poetic fable of an aviator stranded in the Sahara who meets a young prince fallen from an asteroid. A profound meditation on childhood innocence, love, loss, and the eternal truth of human relationships.",
    coverColor: "#1A2B4C",
    coverAccent: "#F1C75B",
    coverSymbol: "⭐",
    pageCount: 140,
    ratingRationale:
      "“It is only with the heart that one can see rightly.” Whenever I think of your genuine warmth and how deeply you care for people, this book immediately comes to mind.",
    readingSource: "https://www.gutenberg.org",
    sampleExcerpt:
      "“And now here is my secret, a very simple secret: It is only with the heart that one can see rightly; what is essential is invisible to the eye.”\n\n“It is the time you have wasted for your rose that makes your rose so important.”",
    isFeatured: true,
    publishedYear: 1943,
    tags: ["Fable", "Beloved Classic", "Philosophy", "Wholesome"],
    chapters: [
      {
        id: "lp-ch1",
        title: "Chapter 1: The Sahara Desert Meeting",
        content:
          "Once upon a time, six years ago, I had an accident with my airplane in the desert of Sahara. Something was broken in my engine. And as I had with me neither a mechanic nor any passengers, I set myself to attempt the difficult repairs all alone. It was a question of life or death for me: I had scarcely enough drinking water to last a week. Then, as dawn broke, an extraordinary little voice awakened me: 'If you please—draw me a sheep!'",
        quote: "Draw me a sheep, please!",
        speaker: "The Little Prince",
      },
      {
        id: "lp-ch2",
        title: "Chapter 2: The Secret of the Fox",
        content:
          "“Goodbye,” said the fox. “And now here is my secret, a very simple secret: It is only with the heart that one can see rightly; what is essential is invisible to the eye.” “What is essential is invisible to the eye,” the little prince repeated, so that he would be sure to remember. “It is the time you have wasted for your rose that makes your rose so important.”",
        quote: "What is essential is invisible to the eye.",
        speaker: "The Fox",
      },
    ],
    studyNotes: [
      "The rose represents unique unconditional love that requires patience.",
      "Adults often look at numbers while children understand true value.",
    ],
    keyQuotes: [
      "It is only with the heart that one can see rightly.",
      "You become responsible forever for what you have tamed.",
    ],
  },

  // 2. Romance - Pride and Prejudice
  {
    id: "book-pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    genreId: "romance",
    description:
      "A sparkling romantic classic exploring the turbulent relationship between Elizabeth Bennet and Fitzwilliam Darcy. A brilliant social satire of manners, pride, and the courage to see beyond initial impressions.",
    coverColor: "#8C3B50",
    coverAccent: "#FBF4E6",
    coverSymbol: "🎀",
    pageCount: 432,
    ratingRationale:
      "Because your sharp wit, radiant smile, and independent spirit rival Elizabeth Bennet herself—and because true love always blossoms through understanding and shared laughter.",
    readingSource: "https://www.gutenberg.org/ebooks/1342",
    sampleExcerpt:
      "“I cannot fix on the hour, or the look, or the words, which laid the foundation. It is too long ago. I was in the middle before I knew that I had begun.”",
    isFeatured: true,
    publishedYear: 1813,
    tags: ["Classic Romance", "Regency", "British Literature", "Wit"],
    chapters: [
      {
        id: "pp-ch1",
        title: "Chapter 1: An Opening Truth",
        content:
          "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
        quote: "It is a truth universally acknowledged...",
        speaker: "Narrator",
      },
      {
        id: "pp-ch2",
        title: "Chapter 2: The Letter of Netherfield",
        content:
          "“In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you.” Elizabeth’s astonishment was beyond expression. She stared, coloured, doubted, and was silent.",
        quote: "You must allow me to tell you how ardently I admire and love you.",
        speaker: "Mr. Darcy",
      },
    ],
    studyNotes: [
      "First impressions are often clouded by pride and societal expectations.",
      "Mutual respect and willingness to admit flaws are the bedrock of lasting love.",
    ],
    keyQuotes: [
      "You have bewitched me body and soul.",
      "My good opinion once lost, is lost forever.",
    ],
  },

  // 3. Mystery & Thriller - The Murder of Roger Ackroyd
  {
    id: "book-roger-ackroyd",
    title: "The Murder of Roger Ackroyd",
    author: "Agatha Christie",
    genreId: "mystery-thriller",
    description:
      "The quintessential country-house murder mystery where Hercule Poirot comes out of quiet retirement to solve a baffling crime in King's Abbot, leading to one of the most brilliant twists in detective history.",
    coverColor: "#263238",
    coverAccent: "#FFA726",
    coverSymbol: "🔎",
    pageCount: 312,
    ratingRationale:
      "You always predict movie plot twists with uncanny accuracy! But let's see if your detective instincts can anticipate Dame Agatha Christie's most audacious masterpiece.",
    sampleExcerpt:
      "“The truth, however ugly in itself, is always curious and beautiful to seekers after it.”\n\n“Everything is simple, if you arrange the facts methodically.” — Hercule Poirot",
    isFeatured: false,
    publishedYear: 1926,
    tags: ["Golden Age Mystery", "Poirot", "Plot Twist", "Classic Detective"],
    chapters: [
      {
        id: "ra-ch1",
        title: "Chapter 1: The Enigma at Fernly Park",
        content:
          "Mrs. Ferrars died on the night of the 16th–17th September—a Thursday. I was sent for at eight o'clock on the morning of Friday the 17th. There was nothing to be done. Death had taken place some hours previously. The little village of King’s Abbot was thrown into a whirlwind of quiet speculation.",
        quote: "The truth is always curious and beautiful to seekers after it.",
        speaker: "Dr. Sheppard",
      },
      {
        id: "ra-ch2",
        title: "Chapter 2: Poirot's Methodical Mind",
        content:
          "M. Hercule Poirot stood by the mantlepiece, twirling his magnificent moustaches with exquisite precision. 'Method, order, and the little grey cells, my dear friend. One must never jump to conclusions. Every fact, however trivial it appears on the surface, has its exact place in the mosaic of truth.'",
        quote: "Method, order, and the little grey cells.",
        speaker: "Hercule Poirot",
      },
    ],
    studyNotes: [
      "Fair-play mystery pioneer: Christie plays with perspective and narrative voice in unprecedented fashion.",
      "Poirot's reliance on psychological deduction rather than physical clues alone.",
    ],
    keyQuotes: [
      "The truth, however ugly in itself, is always curious and beautiful to seekers after it.",
      "Everything is simple, if you arrange the facts methodically.",
    ],
  },

  // 4. Fantasy - The Night Circus
  {
    id: "book-night-circus",
    title: "The Night Circus",
    author: "Erin Morgenstern",
    genreId: "fantasy",
    description:
      "A mysterious competition between two young illusionists, Celia and Marco, staged within an enchanting black-and-white circus that only opens at sunset and closes at dawn.",
    coverColor: "#1A1A24",
    coverAccent: "#E5A93B",
    coverSymbol: "🎪",
    pageCount: 387,
    ratingRationale:
      "The sensory imagery, caramel smells, clockwork wonders, and breathtaking romantic atmosphere feel like stepping right into a cozy dreamscape.",
    sampleExcerpt:
      "“The circus arrives without warning. No announcements precede it. It is simply there, when yesterday it was not. Within the black-and-white striped canvas tents is an utterly unique experience full of breathtaking amazements.”",
    isFeatured: true,
    publishedYear: 2011,
    tags: ["Magical Realism", "Romance", "Circus", "Atmospheric"],
    chapters: [
      {
        id: "nc-ch1",
        title: "Act I: Le Cirque des Rêves",
        content:
          "The circus arrives without warning. No announcements precede it. It is simply there, when yesterday it was not. A black sign with white lettering announces: 'Opens at Sunset, Closes at Dawn.' Within its striped walls lies an ethereal maze of wonders crafted from pure imagination.",
        quote: "You may think that you are standing in a tent, but you are standing in a dream.",
        speaker: "The Chronicler",
      },
      {
        id: "nc-ch2",
        title: "Act II: The Pool of Tears & The Bonfire",
        content:
          "In the center of the courtyard, an immense bonfire blazes without smoke, casting shimmering silver reflections upon the velvet shadows. Celia pauses before the ice garden, where crystal roses blossom beneath frost-dusted archways. Every illusion is a quiet love letter cast into the night.",
        quote: "The finest of arts is that which leaves no trace save for wonder.",
        speaker: "Marco Alisdair",
      },
    ],
    studyNotes: [
      "Atmospheric worldbuilding: every tent represents an artistic challenge between competing magicians.",
      "Love expressed through collaborative creation rather than destructive rivalry.",
    ],
    keyQuotes: [
      "You may think that you are standing in a tent, but you are standing in a dream.",
      "The circus arrives without warning.",
    ],
  },

  // 5. Sci-Fi - Project Hail Mary
  {
    id: "book-project-hail-mary",
    title: "Project Hail Mary",
    author: "Andy Weir",
    genreId: "sci-fi",
    description:
      "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself are doomed. Except right now, he doesn't even remember his own name.",
    coverColor: "#1C3144",
    coverAccent: "#4DD0E1",
    coverSymbol: "🚀",
    pageCount: 496,
    ratingRationale:
      "A heartwarming story of impossible science, profound optimism, and the most touching interstellar friendship ever written.",
    sampleExcerpt:
      "“Human beings have a remarkable ability to accept the abnormal and make it normal. But right now, I'm alone in an alien solar system, and I have a friend named Rocky.”",
    isFeatured: false,
    publishedYear: 2021,
    tags: ["Space", "First Contact", "Hard Sci-Fi", "Optimism"],
    chapters: [
      {
        id: "phm-ch1",
        title: "Chapter 1: Awakening in the Dark",
        content:
          "“What’s two plus two?” the computer asks. I open my dry eyes. There's bright white light. I don't know who I am, where I am, or why I'm in a zero-gravity cockpit. But slowly, the puzzle pieces assemble, and the cosmos begins to answer.",
        quote: "Amaze! Amaze! Amaze!",
        speaker: "Rocky",
      },
      {
        id: "phm-ch2",
        title: "Chapter 2: The Eridian Handshake",
        content:
          "A five-legged carapace taps against the xenonite glass divider. 'You sleep, I watch,' Rocky vibrates harmoniously through his chord organ voice. Two solitary beings from separate stars, facing total extinction, bound together by mutual courage and high-school physics.",
        quote: "Good proud. I am scary space monster, you are leaky space blob.",
        speaker: "Rocky",
      },
    ],
    studyNotes: [
      "Scientific ingenuity mixed with radical empathy across alien civilizations.",
      "Unwavering optimism: problems can be reasoned through with measurement, patience, and humor.",
    ],
    keyQuotes: [
      "Human beings have a remarkable ability to accept the abnormal and make it normal.",
      "Amaze! Amaze! Amaze!",
    ],
  },

  // 6. Biography - Educated
  {
    id: "book-educated",
    title: "Educated: A Memoir",
    author: "Tara Westover",
    genreId: "biography",
    description:
      "An unforgettable memoir about a young girl who, kept out of school by her survivalist family in rural Idaho, teaches herself enough mathematics and grammar to enter college at seventeen and journey all the way to Cambridge.",
    coverColor: "#5D4037",
    coverAccent: "#E0A899",
    coverSymbol: "🖋️",
    pageCount: 352,
    ratingRationale:
      "A tribute to the fierce resilience of the human mind, the transformative power of knowledge, and having the courage to author your own story.",
    sampleExcerpt:
      "“You can love someone and still choose to say goodbye to them,” says Tara. “You can miss a person every day, and still be glad that they are no longer in your life.”",
    isFeatured: false,
    publishedYear: 2018,
    tags: ["Memoir", "Inspirational", "Resilience", "Self-Discovery"],
    chapters: [
      {
        id: "edu-ch1",
        title: "Part I: Mountain Roots",
        content:
          "My strongest memory is not a memory. It's something I imagined, then came to remember as if it had happened. The wind across the Idaho mountain blew through the juniper trees, whisper-teaching me that a world was out there waiting to be discovered.",
        quote: "First find out what you are capable of, then decide who you are.",
        speaker: "Tara Westover",
      },
      {
        id: "edu-ch2",
        title: "Part II: The Power of Self-Discovery",
        content:
          "I sat in the lecture hall listening to words I had never encountered: the Holocaust, civil rights, art history. Each lecture peeled away another layer of inherited fear, replacing it with the sovereign power of an independent intellect.",
        quote: "Education is not the repetition of facts, but the training of the mind to think.",
        speaker: "Tara Westover",
      },
    ],
    studyNotes: [
      "Education as personal emancipation and self-determination.",
      "The painful complexity of family loyalty vs. individual integrity.",
    ],
    keyQuotes: [
      "You can love someone and still choose to say goodbye to them.",
      "First find out what you are capable of, then decide who you are.",
    ],
  },

  // 7. Self-Development - Atomic Habits
  {
    id: "book-atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    genreId: "self-development",
    description:
      "A proven, evidence-based guide to building good habits, breaking bad ones, and mastering the tiny behaviors that lead to remarkable personal transformations over time.",
    coverColor: "#8D4024",
    coverAccent: "#FCEADE",
    coverSymbol: "⚙️",
    pageCount: 320,
    ratingRationale:
      "You already live with such intentional kindness, discipline, and purpose. This book is a lovely reminder that your small everyday efforts create quiet miracles in your life.",
    sampleExcerpt:
      "“You do not rise to the level of your goals. You fall to the level of your systems. Breakthrough moments are often the result of many previous actions, which build up the potential required to unleash a major change.”",
    isFeatured: false,
    publishedYear: 2018,
    tags: ["Personal Development", "Productivity", "Mindset", "Daily Habits"],
    chapters: [
      {
        id: "ah-ch1",
        title: "The Fundamentals: Why Tiny Changes Make a Big Difference",
        content:
          "It is so easy to overestimate the importance of one defining moment and underestimate the value of making small improvements on a daily basis. If you can get 1 percent better each day for one year, you’ll end up thirty-seven times better by the time you’re done.",
        quote: "You fall to the level of your systems.",
        speaker: "James Clear",
      },
      {
        id: "ah-ch2",
        title: "The Four Laws of Behavior Change",
        content:
          "Make it obvious. Make it attractive. Make it easy. Make it satisfying. Real change does not come from dramatic willpower overnight, but from structuring your environment so that your desired habits become the path of least resistance.",
        quote: "Every action you take is a vote for the type of person you wish to become.",
        speaker: "James Clear",
      },
    ],
    studyNotes: [
      "Identity-based habits: focus on who you want to become rather than what you want to achieve.",
      "The compounding effect of small 1% daily increments over time.",
    ],
    keyQuotes: [
      "You do not rise to the level of your goals. You fall to the level of your systems.",
      "Every action you take is a vote for the type of person you wish to become.",
    ],
  },

  // 8. History & Philosophy - Meditations
  {
    id: "book-meditations",
    title: "Meditations (Τὰ εἰς ἑαυτόν)",
    author: "Marcus Aurelius",
    genreId: "history-philosophy",
    description:
      "Private journal writings of the Roman Emperor Marcus Aurelius, recording personal notes to himself on Stoic philosophy, duty, emotional tranquility, and treating all fellow beings with gentleness.",
    coverColor: "#2F3E46",
    coverAccent: "#CAD2C5",
    coverSymbol: "🏛️",
    pageCount: 256,
    ratingRationale:
      "Timeless reflections that bring serene clarity to chaotic days. Whenever life feels fast, Marcus Aurelius reminds us to ground ourselves in quiet inner peace.",
    sampleExcerpt:
      "“You have power over your mind - not outside events. Realize this, and you will find strength.”\n\n“When you arise in the morning think of what a privilege it is to be alive: to think, to enjoy, to love.”",
    isFeatured: false,
    publishedYear: 180,
    tags: ["Stoicism", "Philosophy", "Ancient Rome", "Inner Peace"],
    chapters: [
      {
        id: "med-ch1",
        title: "Book II: Morning Reflections",
        content:
          "When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own.",
        quote: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
        speaker: "Marcus Aurelius",
      },
      {
        id: "med-ch2",
        title: "Book IV: The Inner Citadel",
        content:
          "Nowhere can man find a quieter or more untroubled retreat than in his own soul. Constantly then give yourself this retreat, and renew yourself. Let your rules of life be few and fundamental: that nothing can hurt you unless your soul is degraded by it.",
        quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
        speaker: "Marcus Aurelius",
      },
    ],
    studyNotes: [
      "The Dichotomy of Control: focus energy solely on intentions, ethics, and reactions.",
      "Cosmic perspective: remembering our brief, interconnected place in the natural order.",
    ],
    keyQuotes: [
      "You have power over your mind - not outside events. Realize this, and you will find strength.",
      "When you arise in the morning think of what a privilege it is to be alive.",
    ],
  },

  // 9. Manga - Frieren: Beyond Journey's End
  {
    id: "book-frieren",
    title: "Frieren: Beyond Journey's End (葬送のフリーレン)",
    author: "Kanehito Yamada & Tsukasa Abe",
    genreId: "manga",
    description:
      "The adventure is over, but life goes on for an elven mage beginning to learn what living truly means. After defeating the Demon King, Frieren embarks on a quiet pilgrimage to understand the brief, fleeting lives of the humans who touched her heart.",
    coverColor: "#355070",
    coverAccent: "#E56B6F",
    coverSymbol: "🪄",
    pageCount: 192,
    ratingRationale:
      "Tender, poignant, and overflowing with heartfelt nostalgia. It treats memories as sacred treasures—just like the ones we are building together right here.",
    sampleExcerpt:
      "“It was only a ten-year journey... a mere fraction of my life. Why am I crying? I should have taken the time to get to know him better.”",
    isFeatured: true,
    publishedYear: 2020,
    tags: ["Manga", "Fantasy", "Slice of Life", "Memory & Time"],
    chapters: [
      {
        id: "fr-ch1",
        title: "Chapter 1: The End of the Journey",
        content:
          "The hero party returns to the royal capital after ten long years of struggle. Fireworks illuminate the midnight sky. Himmel looks at Frieren and smiles gently: 'Look, Frieren. The sky is peaceful now.' But for an elf who lives thousands of years, fifty summers pass like a breath. Only when Himmel's funeral arrives does Frieren weep, realizing that every shared human moment was precious.",
        quote: "I want to learn more about humans.",
        speaker: "Frieren",
      },
      {
        id: "fr-ch2",
        title: "Chapter 2: The Grimoire of Blue Flowers",
        content:
          "Walking through old cobblestone villages, Fern watches Frieren diligently hunt for folk magic—spells that turn grapes sour, or make field flowers bloom in vibrant sky blue. 'Why collect such trivial magic?' Fern asks. Frieren smiles: 'Because someone once said it would make a dear friend smile.'",
        quote: "Trivial magic brings the warmest smiles.",
        speaker: "Frieren",
      },
    ],
    studyNotes: [
      "Time is relative: a decade can feel like a flash or an entire lifetime depending on how deeply we connect.",
      "Small acts of kindness outlive monuments.",
    ],
    keyQuotes: [
      "It is the small things we remember most when years turn into centuries.",
    ],
  },

  // 10. Anime-Inspired Stories - Violet Evergarden
  {
    id: "book-violet-evergarden",
    title: "Violet Evergarden: Letters of Heart (ヴァイオレット・エヴァーガーデン)",
    author: "Kana Akatsuki",
    genreId: "anime-inspired",
    description:
      "An Auto Memory Doll named Violet journeys across war-recovering continents writing letters for people unable to express their true feelings, striving to discover the meaning of the words: 'I love you.'",
    coverColor: "#2B3A67",
    coverAccent: "#F4D06F",
    coverSymbol: "💌",
    pageCount: 344,
    ratingRationale:
      "Every single letter Violet writes carries the exact earnest devotion, emotional tenderness, and sincerity that I feel whenever I write notes for you.",
    sampleExcerpt:
      "“No letter is without a recipient. If someone writes with all their heart, those feelings will always cross distances and reach the person they were meant for.”",
    isFeatured: true,
    publishedYear: 2015,
    tags: ["Anime Story", "Letters", "Emotional", "Romance"],
    chapters: [
      {
        id: "ve-ch1",
        title: "Letter I: The Words Left Behind",
        content:
          "Sitting at the polished wooden desk, Violet placed her mechanical silver fingers upon the brass keys of the typewriter. The click-clack echoed in the sunlit postal room. 'Major,' she whispered, 'I still do not fully know what those words mean. But as I help people say what is in their hearts, I feel a quiet warmth blooming here.'",
        quote: "I want to know what 'I love you' means.",
        speaker: "Violet Evergarden",
      },
      {
        id: "ve-ch2",
        title: "Letter II: The Parasol in the Sky",
        content:
          "Holding the blue parasol aloft against the autumn sky, Violet leapt across the shimmering lake. For three miraculous steps upon the water lilies, she held flight, granting a grieving father one final glimpse of his lost daughter's smile.",
        quote: "No letter is without a recipient if written with all one's heart.",
        speaker: "Violet Evergarden",
      },
    ],
    studyNotes: [
      "Epistolary emotional healing: the catharsis of putting unsaid grief and love into written words.",
      "The transition from soldier to chronicler of the human heart.",
    ],
    keyQuotes: [
      "No letter is without a recipient. If someone writes with all their heart, those feelings will reach.",
      "I want to know what 'I love you' means.",
    ],
  },

  // 11. Comics/Graphic Novels - Heartstopper
  {
    id: "book-heartstopper",
    title: "Heartstopper: Volume 1",
    author: "Alice Oseman",
    genreId: "comics-graphic-novels",
    description:
      "A heartwarming graphic novel following Charlie and Nick as they meet, sit together in morning registration, and discover a tender, supportive friendship that slowly blossoms into something deeply cherished.",
    coverColor: "#4B6B94",
    coverAccent: "#F9C784",
    coverSymbol: "🍂",
    pageCount: 288,
    ratingRationale:
      "Pure sunshine and gentle comfort in comic form! Leaves swirling in the margins, cute awkward texts, and wholesome emotional safety.",
    sampleExcerpt:
      "“You're my favorite person, Nick. Even on rainy days when everything feels overwhelming, hearing your laugh makes everything soft again.”",
    isFeatured: false,
    publishedYear: 2019,
    tags: ["Graphic Novel", "Wholesome", "Young Adult", "Illustrated Romance"],
    chapters: [
      {
        id: "hs-ch1",
        title: "Panel Set 1: Morning Homeroom",
        content:
          "The autumn wind sweeps through the open courtyard, scattering golden leaves across the steps. Charlie sits down at desk 4B. Nick turns with a goofy, warm grin: 'Hey.' 'Hi.' A tiny doodle in the margin blossoms into an everyday sanctuary.",
        quote: "Hi.",
        speaker: "Nick & Charlie",
      },
      {
        id: "hs-ch2",
        title: "Panel Set 2: The Snow Day",
        content:
          "Snow falls in thick, silent flurries over the rugby pitch. Nellie the golden retriever bounds through the drifts, barking merrily. Charlie and Nick tumble into the snowbank, laughing until their cheeks glow rosy in the winter chill.",
        quote: "You make everything feel safe and gentle.",
        speaker: "Charlie Spring",
      },
    ],
    studyNotes: [
      "Wholesome emotional affirmation and healthy communication.",
      "Graphic storytelling technique: using leaves, sparks, and margin doodles to express unspoken affection.",
    ],
    keyQuotes: [
      "You're my favorite person, Nick.",
      "Hearing your laugh makes everything soft again.",
    ],
  },

  // 12. Poetry - Dast-e-Saba (Faiz Ahmed Faiz)
  {
    id: "book-dast-e-saba",
    title: "Dast-e-Saba (دستِ صبا)",
    titleUrdu: "دستِ صبا",
    author: "Faiz Ahmed Faiz",
    genreId: "poetry",
    description:
      "A monumental collection of sublime Urdu poetry written during the imprisonment at Hyderabad and Montgomery jails. Blends romantic lyricism with quiet resilience, longing, and eternal hope for light.",
    coverColor: "#4A1D2F",
    coverAccent: "#E0A899",
    coverSymbol: "🌹",
    pageCount: 148,
    ratingRationale:
      "Faiz writes with the exact gentle elegance and grace that defines who you are, Meerah. These verses are made for your quiet reflective evenings with a hot cup of chai.",
    readingSource: "https://rekhta.org/poets/faiz-ahmad-faiz",
    sampleExcerpt:
      "گلوں میں رنگ بھرے باد نوبہار چلے\nچلے بھی آؤ کہ گلشن کا کاروبار چلے\n\nمقام فیضؔ کوئی راہ میں جچا ہی نہیں\nجو کوئے یار سے نکلے تو سوئے دار چلے",
    isFeatured: true,
    publishedYear: 1952,
    tags: ["Urdu Poetry", "Ghazal", "Romanticism", "Classics"],
    chapters: [
      {
        id: "faiz-ch1",
        title: "غزل: گلوں میں رنگ بھرے",
        content:
          "گلوں میں رنگ بھرے بادِ نوبہار چلے\nچلے بھی آؤ کہ گلشن کا کاروبار چلے\n\nقفس اداس ہے یارو صبا سے کچھ تو کہو\nکہیں تو بہرِ خدا آج ذکرِ یار چلے\n\nکبھی تو صبح ترے کنجِ لب سے ہو آغاز\nکبھی تو شب سرِ کاکل سے مشکبار چلے\n\nمقام فیضؔ کوئی راہ میں جچا ہی نہیں\nجو کوئے یار سے نکلے تو سوئے دار چلے",
        quote: "چلے بھی آؤ کہ گلشن کا کاروبار چلے",
        speaker: "فیض احمد فیض",
      },
      {
        id: "faiz-ch2",
        title: "نظم: سرِ وادیِ سینا",
        content:
          "پھر برق فروزاں ہے سرِ وادیِ سینا\nپھر رنگ پہ ہے شعلۂ رخسارِ تمنا\nپھر دل کو تڑپنے کی صدا دی ہے کسی نے\nپھر دیدۂ تر کو بھی نیا خواب دکھایا\n\nاے دیدۂ گریاں تری بیداری سلامت\nاے سینۂ بریاں ترے زخموں کی بہاریں!",
        quote: "اے دیدۂ گریاں تری بیداری سلامت",
        speaker: "فیض احمد فیض",
      },
    ],
    studyNotes: [
      "Written while imprisoned in Montgomery and Hyderabad jails, blending political resilience with lyrical tenderness.",
      "Faiz transforms the traditional Urdu Ghazal vocabulary of longing into universal hope for humanity.",
    ],
    keyQuotes: [
      "گلوں میں رنگ بھرے بادِ نوبہار چلے، چلے بھی آؤ کہ گلشن کا کاروبار چلے",
      "مقام فیضؔ کوئی راہ میں جچا ہی نہیں، جو کوئے یار سے نکلے تو سوئے دار چلے",
    ],
  },

  // 13. Poetry - Kulliyat-e-Iqbal (Allama Iqbal)
  {
    id: "book-kulliyat-iqbal",
    title: "Kulliyat-e-Iqbal (کلیات اقبال)",
    titleUrdu: "کلیات اقبال",
    author: "Allama Muhammad Iqbal",
    genreId: "poetry",
    description:
      "The complete compendium of Iqbal's Urdu philosophical masterworks: Bang-e-Dra, Bal-e-Jibril, Zarb-e-Kaleem, and Armaghan-e-Hijaz. An awakening call to selfhood (Khudi) and soaring spiritual aspiration.",
    coverColor: "#1E4D38",
    coverAccent: "#D4AF37",
    coverSymbol: "🌙",
    pageCount: 654,
    ratingRationale:
      "For your contemplative soul. Iqbal's verse has a rare dignity that always reminds me of your depth of thought, strong principles, and the way you seek purpose in every step.",
    sampleExcerpt:
      "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں\n\nقناعت نہ کر عالم رنگ و بو پر\nچمن اور بھی، آشیان اور بھی ہیں",
    isFeatured: false,
    publishedYear: 1938,
    tags: ["Philosophy", "Urdu Poetry", "Khudi", "Masterpiece"],
    chapters: [
      {
        id: "iqbal-ch1",
        title: "غزل: ستاروں سے آگے جہاں اور بھی ہیں",
        content:
          "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں\n\nتہی زندگی سے نہیں یہ فضائیں\nیہاں سینکڑوں کارواں اور بھی ہیں\n\nقناعت نہ کر عالم رنگ و بو پر\nچمن اور بھی، آشیان اور بھی ہیں\n\nاگر کھو گیا اک نشیمن تو کیا غم\nمقاماتِ آہ و فغاں اور بھی ہیں\n\nتو شاہیں ہے، پرواز ہے کام تیرا\nترے سامنے آسماں اور بھی ہیں",
        quote: "تو شاہیں ہے، پرواز ہے کام تیرا · ترے سامنے آسماں اور بھی ہیں",
        speaker: "علامہ اقبال",
      },
      {
        id: "iqbal-ch2",
        title: "نظم: خودی کا سرِ نہاں",
        content:
          "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے\n\nنگاہِ فقر میں شانِ سکندری کیا ہے\nخراج کی جو گدا ہو وہ قیصری کیا ہے",
        quote: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
        speaker: "علامہ اقبال",
      },
    ],
    keyQuotes: [
      "ستاروں سے آگے جہاں اور بھی ہیں، ابھی عشق کے امتحان اور بھی ہیں۔",
      "تو شاہیں ہے، پرواز ہے کام تیرا، ترے سامنے آسماں اور بھی ہیں۔",
      "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے، خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے۔",
    ],
    studyNotes: [
      "Themes of Khudi (self-realization), spiritual sovereignty, and relentless aspiration.",
      "Bal-e-Jibril contains Iqbal's most mature philosophical ghazals.",
    ],
  },
];

// ============================================================================
// Query & Filter Helper Functions
// ============================================================================

export function filterBooks(
  books: Book[],
  genreId?: string | null,
  searchQuery?: string
): Book[] {
  if (!Array.isArray(books)) return [];

  let filtered = books;

  if (genreId && genreId.trim() !== "" && genreId !== "all") {
    filtered = filtered.filter((b) => b.genreId === genreId);
  }

  if (searchQuery && searchQuery.trim() !== "") {
    const term = searchQuery.trim().toLowerCase();
    filtered = filtered.filter((b) => {
      const matchTitle = b.title.toLowerCase().includes(term);
      const matchUrdu = b.titleUrdu ? b.titleUrdu.toLowerCase().includes(term) : false;
      const matchAuthor = b.author.toLowerCase().includes(term);
      const matchDesc = b.description.toLowerCase().includes(term);
      const matchRationale = b.ratingRationale.toLowerCase().includes(term);
      const matchTags = b.tags ? b.tags.some((t) => t.toLowerCase().includes(term)) : false;

      return matchTitle || matchUrdu || matchAuthor || matchDesc || matchRationale || matchTags;
    });
  }

  return filtered;
}

export function getCuratedRecommendations(books: Book[] = STUDY_BOOKS): Book[] {
  if (!Array.isArray(books)) return [];
  return books.filter((b) => Boolean(b.isFeatured));
}

export function getGenreById(genreId: string): Genre | undefined {
  return STUDY_GENRES.find((g) => g.id === genreId);
}

export function getBooksByGenre(books: Book[], genreId: string): Book[] {
  if (!Array.isArray(books)) return [];
  return books.filter((b) => b.genreId === genreId);
}

export function searchBooks(books: Book[], query: string): Book[] {
  return filterBooks(books, undefined, query);
}

export function resolveReadingSourceDisplay(book: Book): {
  type: "external" | "physical";
  label: string;
  url?: string;
  note: string;
} {
  if (book.readingSource && book.readingSource.trim().length > 0) {
    return {
      type: "external",
      label: "Read Online Excerpt / Digital Edition ↗",
      url: book.readingSource.trim(),
      note: "External digital edition or reading preview available online.",
    };
  }

  return {
    type: "physical",
    label: "Physical Edition · In Your Personal Library",
    note: "A cherished physical volume waiting on your shelf for quiet reading hours.",
  };
}

export function getGenreCounts(books: Book[]): Record<string, number> {
  const counts: Record<string, number> = { all: books.length };
  for (const genre of STUDY_GENRES) {
    counts[genre.id] = 0;
  }
  for (const book of books) {
    if (counts[book.genreId] !== undefined) {
      counts[book.genreId] += 1;
    } else {
      counts[book.genreId] = 1;
    }
  }
  return counts;
}

// ============================================================================
// Reading Progress & Bookmarking Persistence
// ============================================================================

export interface ReadingProgressRecord {
  bookId: string;
  chapterIndex: number;
  percentRead: number;
  isBookmarked: boolean;
  notes: string[];
  lastReadAt: string;
}

const STORAGE_KEY_PROGRESS = "birthday-reading-progress";

export function loadAllReadingProgress(): Record<string, ReadingProgressRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getReadingProgressForBook(bookId: string): ReadingProgressRecord {
  const all = loadAllReadingProgress();
  return (
    all[bookId] || {
      bookId,
      chapterIndex: 0,
      percentRead: 0,
      isBookmarked: false,
      notes: [],
      lastReadAt: new Date().toISOString(),
    }
  );
}

export function saveReadingProgressForBook(
  bookId: string,
  updates: Partial<ReadingProgressRecord>
): ReadingProgressRecord {
  const all = loadAllReadingProgress();
  const current = all[bookId] || {
    bookId,
    chapterIndex: 0,
    percentRead: 0,
    isBookmarked: false,
    notes: [],
    lastReadAt: new Date().toISOString(),
  };

  const updated: ReadingProgressRecord = {
    ...current,
    ...updates,
    bookId,
    lastReadAt: new Date().toISOString(),
  };

  all[bookId] = updated;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(all));
    } catch {
      // Storage quota or private browsing fallback
    }
  }

  return updated;
}
