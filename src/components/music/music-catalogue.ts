/**
 * Pure TypeScript catalogue, types, and state machine helpers
 * for the Music Room in the Birthday project.
 *
 * Free of JSX so it can be imported directly in Node.js native tests.
 */

export type MusicFilterType = "all" | "favorites" | "playlists" | "recently-played";
export type PlayerCardSize = "compact" | "standard" | "expanded";

export interface MusicTrackItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  isFavorite: boolean;
  url: string;
  playlist?: string;
  isLocal?: boolean;
}

export const PLAYLIST_NAMES = [
  "Meerah's Favorites",
  "Acoustic & Soft",
  "Late Night Starlight",
  "Desi Melodies",
  "Timeless Classics",
] as const;

export type PlaylistName = (typeof PLAYLIST_NAMES)[number];

/**
 * 50-song seed catalogue with stable IDs, title, artist, duration,
 * favorite status, and audio asset source.
 */
export const SEED_MUSIC_CATALOGUE: MusicTrackItem[] = [
  {
    id: "track-01",
    title: "Golden Hour",
    artist: "JVKE",
    duration: "3:29",
    durationSeconds: 209,
    isFavorite: true,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-02",
    title: "Lover",
    artist: "Taylor Swift",
    duration: "3:41",
    durationSeconds: 221,
    isFavorite: true,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-03",
    title: "Until I Found You",
    artist: "Stephen Sanchez",
    duration: "2:57",
    durationSeconds: 177,
    isFavorite: true,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-04",
    title: "Afreen Afreen",
    artist: "Rahat Fateh Ali Khan & Momina Mustehsan",
    duration: "6:44",
    durationSeconds: 404,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-05",
    title: "Perfect",
    artist: "Ed Sheeran",
    duration: "4:23",
    durationSeconds: 263,
    isFavorite: true,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-06",
    title: "Yellow",
    artist: "Coldplay",
    duration: "4:29",
    durationSeconds: 269,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-07",
    title: "Adore You",
    artist: "Harry Styles",
    duration: "3:27",
    durationSeconds: 207,
    isFavorite: false,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-08",
    title: "Tu Jhoom",
    artist: "Abida Parveen & Naseebo Lal",
    duration: "6:58",
    durationSeconds: 418,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-09",
    title: "Best Part",
    artist: "Daniel Caesar ft. H.E.R.",
    duration: "3:29",
    durationSeconds: 209,
    isFavorite: true,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-10",
    title: "All of Me",
    artist: "John Legend",
    duration: "4:29",
    durationSeconds: 269,
    isFavorite: false,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-11",
    title: "Pasoori",
    artist: "Ali Sethi & Shae Gill",
    duration: "3:44",
    durationSeconds: 224,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-12",
    title: "Say You Won't Let Go",
    artist: "James Arthur",
    duration: "3:31",
    durationSeconds: 211,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-13",
    title: "Can't Help Falling in Love",
    artist: "Kina Grannis",
    duration: "3:22",
    durationSeconds: 202,
    isFavorite: true,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-14",
    title: "Kesariya",
    artist: "Arijit Singh",
    duration: "4:28",
    durationSeconds: 268,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-15",
    title: "Beyond",
    artist: "Leon Bridges",
    duration: "4:00",
    durationSeconds: 240,
    isFavorite: false,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-16",
    title: "A Thousand Years",
    artist: "Christina Perri",
    duration: "4:45",
    durationSeconds: 285,
    isFavorite: false,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-17",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    duration: "4:22",
    durationSeconds: 262,
    isFavorite: false,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-18",
    title: "Make You Feel My Love",
    artist: "Adele",
    duration: "3:32",
    durationSeconds: 212,
    isFavorite: true,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-19",
    title: "Iktara",
    artist: "Kavita Seth & Amitabh Bhattacharya",
    duration: "4:13",
    durationSeconds: 253,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-20",
    title: "Fly Me to the Moon",
    artist: "Frank Sinatra",
    duration: "2:27",
    durationSeconds: 147,
    isFavorite: false,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-21",
    title: "Stand by Me",
    artist: "Ben E. King",
    duration: "2:57",
    durationSeconds: 177,
    isFavorite: false,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-22",
    title: "Midnight City",
    artist: "M83",
    duration: "4:03",
    durationSeconds: 243,
    isFavorite: false,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-23",
    title: "Khaabon Ke Parinday",
    artist: "Mohit Chauhan & Alyssa Mendonsa",
    duration: "4:13",
    durationSeconds: 253,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-24",
    title: "Here Comes the Sun",
    artist: "The Beatles",
    duration: "3:05",
    durationSeconds: 185,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-25",
    title: "La Vie En Rose",
    artist: "Édith Piaf",
    duration: "3:07",
    durationSeconds: 187,
    isFavorite: true,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-26",
    title: "Raabta",
    artist: "Arijit Singh & Hamsika Iyer",
    duration: "4:04",
    durationSeconds: 244,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-27",
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    duration: "4:41",
    durationSeconds: 281,
    isFavorite: false,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-28",
    title: "Just the Way You Are",
    artist: "Bruno Mars",
    duration: "3:40",
    durationSeconds: 220,
    isFavorite: false,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-29",
    title: "Tajdar-e-Haram",
    artist: "Atif Aslam",
    duration: "10:28",
    durationSeconds: 628,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-30",
    title: "Photograph",
    artist: "Ed Sheeran",
    duration: "4:19",
    durationSeconds: 259,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-31",
    title: "Pehla Nasha",
    artist: "Udit Narayan & Sadhana Sargam",
    duration: "4:51",
    durationSeconds: 291,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-32",
    title: "Put Your Records On",
    artist: "Corinne Bailey Rae",
    duration: "3:35",
    durationSeconds: 215,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-33",
    title: "Channa Mereya",
    artist: "Arijit Singh",
    duration: "4:49",
    durationSeconds: 289,
    isFavorite: false,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-34",
    title: "At Last",
    artist: "Etta James",
    duration: "3:00",
    durationSeconds: 180,
    isFavorite: true,
    url: "",
    playlist: "Timeless Classics",
  },
  {
    id: "track-35",
    title: "Mystery of Love",
    artist: "Sufjan Stevens",
    duration: "4:08",
    durationSeconds: 248,
    isFavorite: false,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-36",
    title: "Agar Tum Saath Ho",
    artist: "Alka Yagnik & Arijit Singh",
    duration: "5:41",
    durationSeconds: 341,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-37",
    title: "Cardigan",
    artist: "Taylor Swift",
    duration: "3:59",
    durationSeconds: 239,
    isFavorite: false,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-38",
    title: "Hona Tha Pyar",
    artist: "Atif Aslam & Hadiqa Kiani",
    duration: "3:42",
    durationSeconds: 222,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-39",
    title: "Electric Love",
    artist: "BØRNS",
    duration: "3:38",
    durationSeconds: 218,
    isFavorite: false,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-40",
    title: "Dil Diyan Gallan",
    artist: "Atif Aslam",
    duration: "4:20",
    durationSeconds: 260,
    isFavorite: false,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-41",
    title: "Space Song",
    artist: "Beach House",
    duration: "5:20",
    durationSeconds: 320,
    isFavorite: true,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-42",
    title: "Kun Faya Kun",
    artist: "A.R. Rahman, Javed Ali & Mohit Chauhan",
    duration: "7:53",
    durationSeconds: 473,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-43",
    title: "Sunflower",
    artist: "Post Malone & Swae Lee",
    duration: "2:38",
    durationSeconds: 158,
    isFavorite: false,
    url: "",
    playlist: "Meerah's Favorites",
  },
  {
    id: "track-44",
    title: "Tere Bina",
    artist: "A.R. Rahman & Chinmayi",
    duration: "5:09",
    durationSeconds: 309,
    isFavorite: false,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-45",
    title: "Bloom",
    artist: "The Paper Kites",
    duration: "3:30",
    durationSeconds: 210,
    isFavorite: true,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-46",
    title: "Mast Magan",
    artist: "Arijit Singh & Chinmayi Sripada",
    duration: "4:40",
    durationSeconds: 280,
    isFavorite: false,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-47",
    title: "Flightless Bird, American Mouth",
    artist: "Iron & Wine",
    duration: "4:02",
    durationSeconds: 242,
    isFavorite: false,
    url: "",
    playlist: "Late Night Starlight",
  },
  {
    id: "track-48",
    title: "Chaap Tilak",
    artist: "Abida Parveen & Rahat Fateh Ali Khan",
    duration: "5:21",
    durationSeconds: 321,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
  {
    id: "track-49",
    title: "First Day of My Life",
    artist: "Bright Eyes",
    duration: "3:08",
    durationSeconds: 188,
    isFavorite: false,
    url: "",
    playlist: "Acoustic & Soft",
  },
  {
    id: "track-50",
    title: "Apna Bana Le",
    artist: "Arijit Singh & Sachin-Jigar",
    duration: "4:21",
    durationSeconds: 261,
    isFavorite: true,
    url: "",
    playlist: "Desi Melodies",
  },
];

export const MUSIC_CATALOGUE: MusicTrackItem[] = SEED_MUSIC_CATALOGUE;

/**
 * Pure state machine / helper: Format seconds into MM:SS (or M:SS).
 * Gracefully handles zero, negative, NaN, and non-numeric inputs.
 */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;
  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}

/**
 * Pure state machine / helper: Parse a duration string like "3:45" or "1:05:30" into total seconds.
 */
export function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr || typeof durationStr !== "string") return 0;
  if (durationStr.includes("-")) return 0;
  const parts = durationStr.trim().split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0) return 0;
    return mins * 60 + secs;
  }
  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const secs = parseInt(parts[2], 10);
    if (isNaN(hrs) || isNaN(mins) || isNaN(secs) || hrs < 0 || mins < 0 || secs < 0) return 0;
    return hrs * 3600 + mins * 60 + secs;
  }
  if (parts.length === 1) {
    const singleNum = parseInt(durationStr, 10);
    return isNaN(singleNum) || singleNum < 0 ? 0 : singleNum;
  }
  return 0;
}

/**
 * Pure state machine / helper: Search and filter tracks.
 * - filter: 'all' | 'favorites' | 'playlists'
 * - selectedPlaylist: optional sub-filter when filter === 'playlists'
 * - query: case-insensitive match on track title or artist
 */
export function searchAndFilterTracks(
  tracks: MusicTrackItem[],
  query: string,
  filter: MusicFilterType,
  selectedPlaylist?: string
): MusicTrackItem[] {
  if (!Array.isArray(tracks)) return [];

  let result = tracks;

  // Filter type stage
  if (filter === "favorites") {
    result = result.filter((t) => Boolean(t.isFavorite));
  } else if (filter === "playlists") {
    if (selectedPlaylist && selectedPlaylist !== "all") {
      result = result.filter((t) => t.playlist === selectedPlaylist);
    } else {
      result = result.filter((t) => Boolean(t.playlist));
    }
  }

  // Search query stage
  const trimmed = (query || "").trim().toLowerCase();
  if (trimmed) {
    result = result.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(trimmed)) ||
        (t.artist && t.artist.toLowerCase().includes(trimmed))
    );
  }

  return result;
}

/**
 * Pure state machine / helper: Compute the next track index.
 * - If totalCount <= 0, returns -1.
 * - If shuffle is true, chooses a random distinct index if totalCount > 1.
 * - If normal forward advance:
 *   - returns currentIndex + 1 if not at the end.
 *   - if at the end (currentIndex >= totalCount - 1):
 *     - if repeat is true, wraps to 0.
 *     - if repeat is false, returns -1 (signals stop / end of queue).
 */
export function getNextTrackIndex(
  currentIndex: number,
  totalCount: number,
  shuffle: boolean = false,
  repeat: boolean = false
): number {
  if (totalCount <= 0) return -1;
  if (totalCount === 1) return 0;

  if (shuffle) {
    let next = Math.floor(Math.random() * totalCount);
    if (next === currentIndex) {
      next = (currentIndex + 1) % totalCount;
    }
    return next;
  }

  if (currentIndex < 0) {
    return 0;
  }

  if (currentIndex < totalCount - 1) {
    return currentIndex + 1;
  }

  // Reached end of tracks
  return repeat ? 0 : -1;
}

/**
 * Pure state machine / helper: Compute the previous track index.
 * - If totalCount <= 0, returns -1.
 * - If currentIndex > 0, returns currentIndex - 1.
 * - If currentIndex <= 0, wraps around to totalCount - 1.
 */
export function getPreviousTrackIndex(currentIndex: number, totalCount: number): number {
  if (totalCount <= 0) return -1;
  if (totalCount === 1) return 0;
  if (currentIndex <= 0) {
    return totalCount - 1;
  }
  if (currentIndex > totalCount - 1) {
    return totalCount - 1;
  }
  return currentIndex - 1;
}

/**
 * Pure state machine / helper: Create a local track item from an uploaded File and blob object URL.
 */
export function createLocalTrack(file: File, objectUrl: string): MusicTrackItem {
  const fileName = file && typeof file.name === "string" ? file.name : "Local Track";
  const cleanTitle = fileName.replace(/\.[^/.]+$/, "").trim() || "Local Track";
  const safeId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: safeId,
    title: cleanTitle,
    artist: "Local Audio File",
    duration: "--:--",
    durationSeconds: 0,
    isFavorite: false,
    url: objectUrl,
    playlist: "Local Uploads",
    isLocal: true,
  };
}

/**
 * Pure state machine / helper: Safely revoke object URLs for local tracks to prevent memory leaks.
 */
export function revokeLocalTrackUrls(tracks: MusicTrackItem[]): void {
  if (!Array.isArray(tracks)) return;
  for (const track of tracks) {
    if (
      track.isLocal &&
      track.url &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      try {
        URL.revokeObjectURL(track.url);
      } catch {
        // Safe noop in non-browser or test runner environments
      }
    }
  }
}


/**
 * Supported audio/video container extensions and MIME types.
 * Standard HTML5 media pipelines decode MP3, AAC, M4A, and MP4 containers
 * (both audio/mp4 and video/mp4 with AAC audio tracks).
 */
export const STANDARD_SUPPORTED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".mp4",
  ".m4a",
  ".aac",
  ".wav",
  ".ogg",
  ".webm",
  ".flac",
] as const;

export const STANDARD_SUPPORTED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "video/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
] as const;

export interface AudioCodecSupport {
  mp3: boolean;
  mp4Audio: boolean;
  aac: boolean;
  m4a: boolean;
  ogg: boolean;
  wav: boolean;
  mp4VideoContainerAudio: boolean;
}

/**
 * Checks browser HTMLMediaElement codec support via canPlayType.
 * Handles server-side rendering (SSR) and environments without DOM audio safely.
 */
export function checkBrowserAudioCodecs(audioElement?: HTMLAudioElement | null): AudioCodecSupport {
  let el = audioElement;
  if (!el && typeof document !== "undefined" && typeof document.createElement === "function") {
    try {
      el = document.createElement("audio");
    } catch {
      el = null;
    }
  }

  if (!el || typeof el.canPlayType !== "function") {
    // In SSR or test environments without canPlayType, assume standard codecs supported
    return {
      mp3: true,
      mp4Audio: true,
      aac: true,
      m4a: true,
      ogg: true,
      wav: true,
      mp4VideoContainerAudio: true,
    };
  }

  const canPlay = (mime: string): boolean => {
    try {
      const res = el!.canPlayType(mime);
      return res === "probably" || res === "maybe";
    } catch {
      return false;
    }
  };

  return {
    mp3: canPlay("audio/mpeg") || canPlay("audio/mp3"),
    mp4Audio: canPlay('audio/mp4; codecs="mp4a.40.2"') || canPlay("audio/mp4"),
    aac: canPlay("audio/aac") || canPlay('audio/mp4; codecs="mp4a.40.2"'),
    m4a: canPlay("audio/x-m4a") || canPlay('audio/mp4; codecs="mp4a.40.2"'),
    ogg: canPlay('audio/ogg; codecs="vorbis"'),
    wav: canPlay("audio/wav"),
    mp4VideoContainerAudio:
      canPlay('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') ||
      canPlay("video/mp4") ||
      canPlay("audio/mp4"),
  };
}

/**
 * Tests whether a given file name, URL, or MIME type is an HTML5-supported audio/media file.
 */
export function isSupportedAudioFormat(urlOrFilename: string, mimeType?: string): boolean {
  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().split(";")[0].trim();
    if (STANDARD_SUPPORTED_AUDIO_MIMES.includes(cleanMime as (typeof STANDARD_SUPPORTED_AUDIO_MIMES)[number])) {
      return true;
    }
    if (cleanMime.startsWith("audio/")) return true;
  }

  if (!urlOrFilename || typeof urlOrFilename !== "string") return false;
  const cleanUrl = urlOrFilename.split("?")[0].split("#")[0].toLowerCase();
  return STANDARD_SUPPORTED_AUDIO_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext));
}

/**
 * Tests whether a URL, file name, or MIME type refers to an MP4 media container
 * (audio/mp4, video/mp4, .mp4, or .m4a).
 */
export function isMp4Media(urlOrFilename: string, mimeType?: string): boolean {
  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().split(";")[0].trim();
    if (cleanMime === "video/mp4" || cleanMime === "audio/mp4" || cleanMime === "audio/x-m4a") {
      return true;
    }
  }

  if (!urlOrFilename || typeof urlOrFilename !== "string") return false;
  const cleanUrl = urlOrFilename.split("?")[0].split("#")[0].toLowerCase();
  return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".m4a");
}
