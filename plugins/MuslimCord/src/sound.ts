import { findByProps } from "@vendetta/metro";
import { url as vendettaUrl } from "@vendetta/metro/common";
import type { MuslimCordStorage } from ".";

export type SoundMode = "simple" | "adhan";
export type AdhanVoiceId = "ali-ahmed-mullah" | "mishary-alafasy" | "doha-qatar";
export type AdhanVariant = "normal" | "fajr";
export type QuranFmStationId = "cairo" | "saudi" | "usa";
export type AudioDownloadState = "not-downloaded" | "downloading" | "downloaded" | "failed";
export type AudioProgress = { loaded: number; total: number; percent: number };

export type AudioVoice = {
  id: AdhanVoiceId;
  name: string;
  nameAr: string;
  normalUrl: string;
  fajrUrl: string;
  normalMime: string;
  fajrMime: string;
  attribution: string;
  attributionUrl: string;
};

export type QuranFmStation = {
  id: QuranFmStationId;
  name: string;
  nameAr: string;
  url: string;
  sourceUrl: string;
};

export type QuranFmPlaybackResult = "native" | "web" | "external" | "failed";

export const AUDIO_VOICES: AudioVoice[] = [
  {
    id: "ali-ahmed-mullah",
    name: "Sheikh Ali Ahmed Mullah",
    nameAr: "الشيخ علي أحمد ملا",
    normalUrl: "https://archive.org/download/MakkahAzan/12thNov09IshaAzanBySheikhAliAhmedMullah_512kb.mp4",
    fajrUrl: "https://archive.org/download/MakkahFajrAdhan6913SheikhAliMullah/Makkah%20Fajr%20Adhan%206-9-13%20Sheikh%20Ali%20Mullah.mp3",
    normalMime: "audio/mp4",
    fajrMime: "audio/mpeg",
    attribution: "Makkah Azan archive — Sheikh Ali Ahmed Mullah",
    attributionUrl: "https://archive.org/details/MakkahAzan",
  },
  {
    id: "mishary-alafasy",
    name: "Sheikh Mishary Rashid Alafasy",
    nameAr: "الشيخ مشاري راشد العفاسي",
    normalUrl: "https://media.assabile.com/assabile/adhan_3435370/e9ab8052fdb8.mp3",
    fajrUrl: "https://media.assabile.com/assabile/adhan_3435370/ddb21f7363eb.mp3",
    normalMime: "audio/mpeg",
    fajrMime: "audio/mpeg",
    attribution: "Mishary Rashid Alafasy — Adhan Al Kuwait / Adhan Al Fajr Al Kuwait",
    attributionUrl: "https://www.assabile.com/adhan-call-prayer",
  },
  {
    id: "doha-qatar",
    name: "Doha, Qatar public recording",
    nameAr: "تسجيل عام من الدوحة، قطر",
    normalUrl: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3",
    fajrUrl: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3",
    normalMime: "audio/mpeg",
    fajrMime: "audio/mpeg",
    attribution: "Adhan Recordings from Doha, Qatar — public-domain archive item",
    attributionUrl: "https://archive.org/details/adhan.recordings.from.doha.qatar",
  },
];

export const QURAN_FM_STATIONS: QuranFmStation[] = [
  {
    id: "cairo",
    name: "Quran Radio Cairo — 98.2 FM",
    nameAr: "إذاعة القرآن الكريم من القاهرة — ٩٨.٢ FM",
    url: "https://stream.radiojar.com/8s5u5tpdtwzuv",
    sourceUrl: "https://surahquran.com/Radio-Quran-Cairo.html",
  },
  {
    id: "saudi",
    name: "Quran Radio Saudi Arabia",
    nameAr: "إذاعة القرآن الكريم من السعودية",
    url: "https://stream.radiojar.com/4wqre23fytzuv",
    sourceUrl: "https://surahquran.com/Radio-Quran-Saudi.html",
  },
  {
    id: "usa",
    name: "Quran Radio USA — Tarateel",
    nameAr: "إذاعة القرآن الكريم USA — ترتيل",
    url: "https://qurango.net/radio/tarateel",
    sourceUrl: "https://surahquran.com/Radio-Quran-USA.html",
  },
];

function cacheKey(id: AdhanVoiceId, variant: AdhanVariant): string {
  return `${id}:${variant}`;
}

function getCache(storage: MuslimCordStorage): Record<string, string> {
  storage.audioCache ??= {};
  return storage.audioCache;
}

let activeNativePlayer: any;
let activeWebPlayer: any;
let activeStreamManager: any;
let activeStreamKey: number | undefined;
let streamKeyCounter = 500000;

function getNativeModules(): any | undefined {
  try {
    return (globalThis as any).ReactNative?.NativeModules || (globalThis as any).window?.ReactNative?.NativeModules;
  } catch {
    return undefined;
  }
}

function stopNativeAudio(): void {
  try { activeNativePlayer?.stop?.(); } catch { /* ignored */ }
  activeNativePlayer = undefined;
  if (activeStreamManager && activeStreamKey !== undefined) {
    try { activeStreamManager.stop?.(activeStreamKey); } catch { /* ignored */ }
    try { activeStreamManager.release?.(activeStreamKey); } catch { /* ignored */ }
  }
  activeStreamManager = undefined;
  activeStreamKey = undefined;
}

function stopWebAudio(): void {
  try { activeWebPlayer?.pause?.(); activeWebPlayer?.removeAttribute?.("src"); activeWebPlayer?.load?.(); } catch { /* ignored */ }
  activeWebPlayer = undefined;
}

export function stopQuranFm(): void {
  stopNativeAudio();
  stopWebAudio();
}

function getNativeAudioSound(): any | undefined {
  try {
    return (findByProps("MobileAudioSound") as any)?.MobileAudioSound;
  } catch {
    return undefined;
  }
}

function playNativeAudio(url: string, onFailure?: () => void): boolean {
  const MobileAudioSound = getNativeAudioSound();
  if (!MobileAudioSound) return false;
  try {
    stopNativeAudio();
    activeNativePlayer = new MobileAudioSound(url, "vibing_wumpus", 0.85, "default", false);
    if (typeof activeNativePlayer.play !== "function") return false;
    const result = activeNativePlayer.play();
    result?.catch?.(() => onFailure?.());
    return true;
  } catch {
    onFailure?.();
    return false;
  }
}

function playNativeStream(url: string): Promise<boolean> {
  const manager = getNativeModules()?.DCDSoundManager;
  if (!manager?.prepare || !manager?.play) return Promise.resolve(false);
  stopNativeAudio();
  const key = ++streamKeyCounter;
  activeStreamManager = manager;
  activeStreamKey = key;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      if (!success && activeStreamKey === key) {
        try { manager.release?.(key); } catch { /* ignored */ }
        activeStreamManager = undefined;
        activeStreamKey = undefined;
      }
      resolve(success);
    };
    try {
      manager.prepare(url, "media", key, (error: unknown) => {
        if (error !== null && error !== undefined && error !== "") {
          finish(false);
          return;
        }
        try {
          manager.play(key);
          finish(true);
        } catch {
          finish(false);
        }
      });
      setTimeout(() => finish(false), 8000);
    } catch {
      finish(false);
    }
  });
}

function playTone(frequency = 880, duration = 180): void {
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
  } catch { /* no Web Audio API */ }
}

function playWebAudio(url: string, mime: string, onFailure?: () => void): boolean {
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (!AudioCtor) return false;
    stopWebAudio();
    const player = new AudioCtor(url);
    player.type = mime;
    player.volume = 0.85;
    activeWebPlayer = player;
    const promise = player.play?.();
    promise?.catch?.(() => onFailure?.());
    return true;
  } catch {
    onFailure?.();
    return false;
  }
}

function playSource(url: string, mime: string, fallbackUrl?: string, onFailure?: () => void): boolean {
  let fallbackUsed = false;
  const failed = () => {
    if (!fallbackUsed && fallbackUrl && fallbackUrl !== url) {
      fallbackUsed = true;
      if (playNativeAudio(fallbackUrl, () => playWebAudio(fallbackUrl, mime, () => { playTone(740, 340); onFailure?.(); }))) return;
      if (playWebAudio(fallbackUrl, mime, () => { playTone(740, 340); onFailure?.(); })) return;
    }
    playTone(740, 340);
    onFailure?.();
  };
  if (playNativeAudio(url, failed)) return true;
  if (playWebAudio(url, mime, failed)) return true;
  failed();
  return false;
}

export function getVoice(id: AdhanVoiceId): AudioVoice {
  return AUDIO_VOICES.find((voice) => voice.id === id) || AUDIO_VOICES[0];
}

export function getVoiceVariant(voice: AudioVoice, variant: AdhanVariant): { url: string; mime: string; key: string } {
  return {
    url: variant === "fajr" ? voice.fajrUrl : voice.normalUrl,
    mime: variant === "fajr" ? voice.fajrMime : voice.normalMime,
    key: cacheKey(voice.id, variant),
  };
}

export function getAudioState(storage: MuslimCordStorage, id: string): AudioDownloadState {
  return storage.audioDownloadState?.[id] || (storage.audioCache?.[id] ? "downloaded" : "not-downloaded");
}

export function getAudioProgress(storage: MuslimCordStorage, id: string): AudioProgress | undefined {
  return storage.audioDownloadProgress?.[id];
}

export async function downloadVoice(storage: MuslimCordStorage, voice: AudioVoice, variant: AdhanVariant): Promise<boolean> {
  const target = getVoiceVariant(voice, variant);
  storage.audioDownloadState ??= {};
  storage.audioDownloadProgress ??= {};
  storage.audioDownloadError ??= {};
  storage.audioDownloadState[target.key] = "downloading";
  storage.audioDownloadProgress[target.key] = { loaded: 0, total: 0, percent: 0 };
  delete storage.audioDownloadError[target.key];
  try {
    const response = await fetch(target.url, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Audio download failed: ${response.status}`);
    const total = Number(response.headers.get("content-length") || 0);
    let loaded = 0;
    let blob: Blob;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        if (item.value) {
          chunks.push(item.value);
          loaded += item.value.byteLength;
          storage.audioDownloadProgress[target.key] = { loaded, total, percent: total ? Math.min(100, Math.round((loaded / total) * 100)) : 0 };
        }
      }
      blob = new Blob(chunks as unknown as BlobPart[], { type: target.mime });
    } else {
      blob = await response.blob();
      loaded = blob.size;
      storage.audioDownloadProgress[target.key] = { loaded, total: total || loaded, percent: 100 };
    }
    const FileReaderCtor = (globalThis as any).FileReader;
    if (!FileReaderCtor) throw new Error("Local audio storage is unavailable in this client");
    const dataUri = await new Promise<string | null>((resolve) => {
      try {
        const reader = new FileReaderCtor();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      } catch { resolve(null); }
    });
    if (!dataUri) throw new Error("Could not create a local audio copy");
    getCache(storage)[target.key] = dataUri;
    storage.audioDownloadProgress[target.key] = { loaded: loaded || blob.size, total: total || blob.size, percent: 100 };
    storage.audioDownloadState[target.key] = "downloaded";
    return true;
  } catch (error) {
    storage.audioDownloadState[target.key] = "failed";
    storage.audioDownloadError[target.key] = String(error);
    return false;
  }
}

export async function downloadAllVoices(storage: MuslimCordStorage): Promise<number> {
  let completed = 0;
  for (const voice of AUDIO_VOICES) {
    for (const variant of ["normal", "fajr"] as const) {
      if (await downloadVoice(storage, voice, variant)) completed += 1;
    }
  }
  return completed;
}

export function clearAudioCache(storage: MuslimCordStorage): void {
  storage.audioCache = {};
  storage.audioDownloadState = {};
  storage.audioDownloadProgress = {};
  storage.audioDownloadError = {};
}

export function playReminderSound(storage: MuslimCordStorage, mode: SoundMode, voiceId = storage.adhanVoice, variant: AdhanVariant = "normal", onFailure?: () => void): void {
  if (mode === "simple") {
    playTone(880, 170);
    return;
  }
  const voice = getVoice(voiceId || "ali-ahmed-mullah");
  const target = getVoiceVariant(voice, variant);
  const cached = getCache(storage)[target.key];
  playSource(target.url, target.mime, cached && cached !== target.url ? cached : undefined, onFailure);
}

export function playDownloadedAdhan(storage: MuslimCordStorage, voiceId: AdhanVoiceId, variant: AdhanVariant, onMissing?: () => void, onFailure?: () => void): boolean {
  const voice = getVoice(voiceId);
  const target = getVoiceVariant(voice, variant);
  const cached = getCache(storage)[target.key];
  const isLocal = Boolean(cached && cached !== target.url && !/^https?:\/\//i.test(cached));
  if (!isLocal) {
    onMissing?.();
    return false;
  }
  playSource(cached, target.mime, undefined, onFailure);
  return true;
}

export async function playQuranFm(stationId: QuranFmStationId, onFailure?: () => void): Promise<QuranFmPlaybackResult> {
  const station = QURAN_FM_STATIONS.find((item) => item.id === stationId) || QURAN_FM_STATIONS[0];
  stopQuranFm();
  if (await playNativeStream(station.url)) return "native";
  if (playWebAudio(station.url, "audio/mpeg", onFailure)) return "web";
  try {
    vendettaUrl.openURL(station.url);
    return "external";
  } catch {
    onFailure?.();
    return "failed";
  }
}
