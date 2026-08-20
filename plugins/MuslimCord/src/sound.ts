import { findByProps } from "@vendetta/metro";
import type { MuslimCordStorage } from ".";

export type SoundMode = "simple" | "adhan";
export type AdhanVoiceId = "ali-ahmed-mullah" | "sabah-fakhry" | "aaqib-azeez" | "doha-qatar";
export type AudioDownloadState = "not-downloaded" | "downloading" | "downloaded" | "failed";
export type AudioProgress = { loaded: number; total: number; percent: number };

export type AudioVoice = {
  id: AdhanVoiceId;
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

function getCache(storage: MuslimCordStorage): Record<string, string> {
  storage.audioCache ??= {};
  return storage.audioCache;
}

let activeNativePlayer: any;

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
    void activeNativePlayer?.stop?.();
    // Discord's MobileAudioSound constructor expects the internal sound key
    // (for example vibing_wumpus), not the public usage name "media".
    // The key is mapped to the native MEDIA channel by Discord itself.
    activeNativePlayer = new MobileAudioSound(url, "vibing_wumpus", 0.85, "default", false);
    if (typeof activeNativePlayer.play !== "function") return false;
    // MobileAudioSound.play() performs its own preload wait. Calling it directly avoids
    // relying on an onLoad callback that some Stable builds never emit.
    const playPromise = activeNativePlayer.play();
    playPromise?.catch?.(() => onFailure?.());
    return true;
  } catch {
    onFailure?.();
    return false;
  }
}

function toDataUri(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const FileReaderCtor = (globalThis as any).FileReader;
      if (!FileReaderCtor) return resolve(null);
      const reader = new FileReaderCtor();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch {
      resolve(null);
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
  } catch {
    // No Web Audio API in this runtime.
  }
}

function playWebAudio(url: string, mime: string, onFailure?: () => void): boolean {
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (!AudioCtor) return false;
    const player = new AudioCtor(url);
    player.type = mime;
    player.volume = 0.85;
    const promise = player.play?.();
    if (promise?.catch) promise.catch(() => onFailure?.());
    return true;
  } catch {
    onFailure?.();
    return false;
  }
}

function playSource(url: string, voice: AudioVoice, fallbackUrl?: string, onFailure?: () => void): boolean {
  let fallbackUsed = false;
  const retryRemote = () => {
    if (fallbackUsed || !fallbackUrl || fallbackUrl === url) {
      playTone(740, 340);
      onFailure?.();
      return;
    }
    fallbackUsed = true;
    if (!playNativeAudio(fallbackUrl, () => playWebAudio(fallbackUrl, voice.mime, () => playTone(740, 340)))) {
      if (!playWebAudio(fallbackUrl, voice.mime, () => playTone(740, 340))) playTone(740, 340);
    }
  };
  if (playNativeAudio(url, retryRemote)) return true;
  if (playWebAudio(url, voice.mime, retryRemote)) return true;
  if (fallbackUrl && fallbackUrl !== url) {
    if (playNativeAudio(fallbackUrl, () => playWebAudio(fallbackUrl, voice.mime, () => playTone(740, 340)))) return true;
    if (playWebAudio(fallbackUrl, voice.mime, () => playTone(740, 340))) return true;
  }
  playTone(740, 340);
  onFailure?.();
  return false;
}

export function getVoice(id: AdhanVoiceId): AudioVoice {
  return AUDIO_VOICES.find((voice) => voice.id === id) || AUDIO_VOICES[0];
}

export function getAudioState(storage: MuslimCordStorage, id: string): AudioDownloadState {
  return storage.audioDownloadState?.[id] || (storage.audioCache?.[id] ? "downloaded" : "not-downloaded");
}

export function getAudioProgress(storage: MuslimCordStorage, id: string): AudioProgress | undefined {
  return storage.audioDownloadProgress?.[id];
}

export async function downloadVoice(storage: MuslimCordStorage, voice: AudioVoice): Promise<boolean> {
  storage.audioDownloadState ??= {};
  storage.audioDownloadProgress ??= {};
  storage.audioDownloadError ??= {};
  storage.audioDownloadState[voice.id] = "downloading";
  storage.audioDownloadProgress[voice.id] = { loaded: 0, total: 0, percent: 0 };
  delete storage.audioDownloadError[voice.id];
  try {
    const response = await fetch(voice.url, { cache: "force-cache" });
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
          storage.audioDownloadProgress[voice.id] = { loaded, total, percent: total ? Math.min(100, Math.round((loaded / total) * 100)) : 0 };
        }
      }
      blob = new Blob(chunks as unknown as BlobPart[], { type: voice.mime });
    } else {
      blob = await response.blob();
      loaded = blob.size;
      storage.audioDownloadProgress[voice.id] = { loaded, total: total || loaded, percent: 100 };
    }
    const dataUri = await toDataUri(blob);
    // The native player accepts remote URLs reliably; the data URI is kept for runtimes that can play it offline.
    getCache(storage)[voice.id] = dataUri || voice.url;
    storage.audioDownloadProgress[voice.id] = { loaded: loaded || blob.size, total: total || blob.size, percent: 100 };
    storage.audioDownloadState[voice.id] = "downloaded";
    return true;
  } catch (error) {
    storage.audioDownloadState[voice.id] = "failed";
    storage.audioDownloadError[voice.id] = String(error);
    return false;
  }
}

export async function downloadAllVoices(storage: MuslimCordStorage): Promise<number> {
  let completed = 0;
  for (const voice of AUDIO_VOICES) {
    if (await downloadVoice(storage, voice)) completed += 1;
  }
  return completed;
}

export function clearAudioCache(storage: MuslimCordStorage): void {
  storage.audioCache = {};
  storage.audioDownloadState = {};
  storage.audioDownloadProgress = {};
  storage.audioDownloadError = {};
}

export function playReminderSound(storage: MuslimCordStorage, mode: SoundMode, voiceId = storage.adhanVoice, onFailure?: () => void): void {
  if (mode === "simple") {
    playTone(880, 170);
    return;
  }
  const voice = getVoice(voiceId || "ali-ahmed-mullah");
  const cached = getCache(storage)[voice.id];
  // Native Android players generally reject data: URIs. Prefer the verified remote media URL;
  // keep the cache as a fallback for web-capable runtimes.
  playSource(voice.url, voice, cached && cached !== voice.url ? cached : undefined, onFailure);
}
