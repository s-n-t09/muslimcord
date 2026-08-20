import type { MuslimCordStorage } from ".";

export type SoundMode = "simple" | "takbeer" | "adhan";
export type AdhanVoiceId = "ali-ahmed-mullah" | "sabah-fakhry" | "aaqib-azeez" | "doha-qatar";
export type AudioVoiceId = AdhanVoiceId | "ali-mullah-takbeer";
export type AudioDownloadState = "not-downloaded" | "downloading" | "downloaded" | "failed";

export type AudioVoice = {
  id: AudioVoiceId;
  name: string;
  nameAr: string;
  url: string;
  mime: string;
  attribution: string;
  attributionUrl: string;
};

export const AUDIO_VOICES: AudioVoice[] = [
  {
    id: "ali-ahmed-mullah",
    name: "Sheikh Ali Ahmed Mullah",
    nameAr: "الشيخ علي أحمد ملا",
    url: "https://archive.org/download/MakkahAzan/12thNov09IshaAzanBySheikhAliAhmedMullah_512kb.mp4",
    mime: "audio/mp4",
    attribution: "Makkah Azan — Sheikh Ali Ahmed Mullah, public-domain Archive item",
    attributionUrl: "https://archive.org/details/MakkahAzan",
  },
  {
    id: "sabah-fakhry",
    name: "Sabah Fakhry",
    nameAr: "صباح فخري",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Call_to_prayer_by_Sabah_Fakhry.mp3",
    mime: "audio/mpeg",
    attribution: "Call to prayer by Sabah Fakhry — Wikimedia Commons public domain",
    attributionUrl: "https://commons.wikimedia.org/wiki/File:Call_to_prayer_by_Sabah_Fakhry.mp3",
  },
  {
    id: "aaqib-azeez",
    name: "Aaqib Azeez",
    nameAr: "عاقب عزيز",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3",
    mime: "audio/mpeg",
    attribution: "The Adhan by Aaqib Azeez — Wikimedia Commons CC BY-SA 4.0",
    attributionUrl: "https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3",
  },
  {
    id: "doha-qatar",
    name: "Doha, Qatar public recording",
    nameAr: "تسجيل عام من الدوحة، قطر",
    url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3",
    mime: "audio/mpeg",
    attribution: "Adhan Recordings from Doha, Qatar — public domain",
    attributionUrl: "https://archive.org/details/adhan.recordings.from.doha.qatar",
  },
];

export const TAKBEER_VOICE: AudioVoice = {
  ...AUDIO_VOICES[0],
  id: "ali-mullah-takbeer",
  name: "Sheikh Ali Ahmed Mullah — Eid Takbir",
  nameAr: "الشيخ علي أحمد ملا — تكبيرات العيد",
  url: "https://archive.org/download/EidTakbirBySheikhAliMullah/EidTakbirBySheikhAliMullah_64kb.mp3",
  mime: "audio/mpeg",
  attribution: "Eid Takbir by Sheikh Ali Mullah — public domain",
  attributionUrl: "https://archive.org/details/EidTakbirBySheikhAliMullah",
};

const SIMPLE_TONE = 880;

type CacheRecord = Record<string, string>;

function getCache(storage: MuslimCordStorage): CacheRecord {
  storage.audioCache ??= {};
  return storage.audioCache;
}

function toDataUri(blob: Blob, mime: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const FileReaderCtor = (globalThis as any).FileReader;
      if (FileReaderCtor) {
        const reader = new FileReaderCtor();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
        return;
      }
    } catch {
      // Fall through to URL playback when FileReader is not available in the mobile runtime.
    }
    resolve(null);
  });
}

function playTone(frequency = SIMPLE_TONE, duration = 180): void {
  try {
    const AudioContextCtor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration / 1000 + 0.02);
  } catch {
    // Some Android Discord runtimes expose no Web Audio API.
  }
}

function playAudioUrl(url: string, mime: string, onFailure?: () => void): boolean {
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (!AudioCtor) return false;
    const player = new AudioCtor(url);
    player.type = mime;
    player.volume = 0.75;
    const promise = player.play?.();
    if (promise?.catch) promise.catch(() => onFailure?.());
    return true;
  } catch {
    onFailure?.();
    return false;
  }
}

function playTakbeerFallback(): void {
  try {
    const speech = (globalThis as any).speechSynthesis;
    const Utterance = (globalThis as any).SpeechSynthesisUtterance;
    if (speech && Utterance) {
      const utterance = new Utterance("الله أكبر");
      utterance.lang = "ar-SA";
      utterance.rate = 0.78;
      utterance.volume = 0.8;
      speech.cancel();
      speech.speak(utterance);
      return;
    }
  } catch {
    // Fall through to an audible fallback.
  }
  playTone(660, 230);
  setTimeout(() => playTone(880, 320), 250);
}

export function getVoice(id: AdhanVoiceId): AudioVoice {
  return AUDIO_VOICES.find((voice) => voice.id === id) || AUDIO_VOICES[0];
}

export function isDownloaded(storage: MuslimCordStorage, id: string): boolean {
  return Boolean(getCache(storage)[id]);
}

export function downloadState(storage: MuslimCordStorage, id: string): AudioDownloadState {
  const states = storage.audioDownloadState || {};
  return states[id] || (isDownloaded(storage, id) ? "downloaded" : "not-downloaded");
}

export async function downloadVoice(storage: MuslimCordStorage, voice: AudioVoice): Promise<boolean> {
  storage.audioDownloadState ??= {};
  storage.audioDownloadState[voice.id] = "downloading";
  try {
    const response = await fetch(voice.url, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Audio download failed: ${response.status}`);
    const blob = await response.blob();
    const dataUri = await toDataUri(blob, voice.mime);
    const cache = getCache(storage);
    // A data URI is preferred for offline playback; URL fallback still records a local choice.
    cache[voice.id] = dataUri || voice.url;
    storage.audioDownloadState[voice.id] = "downloaded";
    return true;
  } catch {
    storage.audioDownloadState[voice.id] = "failed";
    return false;
  }
}

export async function downloadAllVoices(storage: MuslimCordStorage): Promise<number> {
  let completed = 0;
  for (const voice of [...AUDIO_VOICES, TAKBEER_VOICE]) {
    if (await downloadVoice(storage, voice)) completed += 1;
  }
  return completed;
}

export function clearAudioCache(storage: MuslimCordStorage): void {
  storage.audioCache = {};
  storage.audioDownloadState = {};
}

export function playVoice(storage: MuslimCordStorage, voice: AudioVoice): void {
  const cached = getCache(storage)[voice.id];
  const source = cached || voice.url;
  const played = playAudioUrl(source, voice.mime, playTakbeerFallback);
  if (!played) playTakbeerFallback();
}

export function playReminderSound(storage: MuslimCordStorage, mode: SoundMode, prayerIndex = 0): void {
  if (mode === "simple") {
    playTone(SIMPLE_TONE, 170);
    return;
  }
  if (mode === "takbeer") {
    playVoice(storage, TAKBEER_VOICE);
    return;
  }
  const voice = getVoice(storage.adhanVoice || "ali-ahmed-mullah");
  const cached = getCache(storage)[voice.id];
  const source = cached || voice.url;
  const played = playAudioUrl(source, voice.mime, () => playTone(740, 340));
  if (!played) playTone(740, 340);
}
