import { findByProps } from "@vendetta/metro";
import type { MuslimCordStorage } from ".";

export type SoundMode = "simple" | "adhan";
export type AdhanVoiceId = "ali-ahmed-mullah" | "mishary-alafasy" | "doha-qatar";
export type AdhanVariant = "normal" | "fajr";
export type AudioDownloadState = "not-downloaded" | "downloading" | "downloaded" | "failed";
export type AudioProgress = { loaded: number; total: number; percent: number; speedBytesPerSecond: number; etaSeconds?: number };

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

function cacheKey(id: AdhanVoiceId, variant: AdhanVariant): string {
  return `${id}:${variant}`;
}

function getCache(storage: MuslimCordStorage): Record<string, string> {
  storage.audioCache ??= {};
  return storage.audioCache;
}

type NativeFileManager = {
  writeFile?: (storageDir: "cache" | "documents", path: string, data: string, encoding: "base64" | "utf8") => Promise<string>;
  getConstants?: () => { CacheDirPath?: string; DocumentsDirPath?: string };
};

function getNativeFileManager(): NativeFileManager | undefined {
  try {
    const root = globalThis as any;
    const proxy = root.nativeModuleProxy || root.window?.nativeModuleProxy;
    for (const name of ["NativeFileModule", "RTNFileManager", "DCDFileManager"]) {
      const module = root.__turboModuleProxy?.(name) || proxy?.[name];
      if (module?.writeFile && module?.getConstants) return module as NativeFileManager;
    }
  } catch { /* unsupported client */ }
  return undefined;
}

function isSafeLocalAudioUri(value: unknown): value is string {
  return typeof value === "string" && /^(?:file|content):\/\//i.test(value);
}

function localFileUri(writtenPath: unknown, manager: NativeFileManager, relativePath: string): string | undefined {
  const returned = typeof writtenPath === "string" ? writtenPath : "";
  if (/^(?:file|content):\/\//i.test(returned)) return returned;
  if (returned.startsWith("/")) return `file://${returned}`;
  const documentsDir = manager.getConstants?.().DocumentsDirPath;
  if (documentsDir) return `file://${documentsDir.replace(/\/$/, "")}/${returned || relativePath}`;
  return undefined;
}

async function blobToBase64(blob: Blob): Promise<string> {
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
  const comma = dataUri?.indexOf(",") ?? -1;
  if (!dataUri || comma < 0) throw new Error("Could not encode a local audio copy");
  const base64 = dataUri.slice(comma + 1);
  if (!base64) throw new Error("Could not encode a local audio copy");
  return base64;
}

async function writeLocalAudio(storage: MuslimCordStorage, key: string, blob: Blob): Promise<string> {
  const manager = getNativeFileManager();
  if (!manager?.writeFile) throw new Error("This client does not expose a safe local audio file manager");
  const safeName = key.replace(/[^a-z0-9_-]+/gi, "_");
  const extension = blob.type.includes("mp4") ? "mp4" : "mp3";
  const relativePath = `muslimcord/adhan/${safeName}.${extension}`;
  const base64 = await blobToBase64(blob);
  const writtenPath = await manager.writeFile("documents", relativePath, base64, "base64");
  const uri = localFileUri(writtenPath, manager, relativePath);
  if (!uri || !isSafeLocalAudioUri(uri)) throw new Error("The local audio file path is unsupported");
  getCache(storage)[key] = uri;
  return uri;
}

export function sanitizeAudioCache(storage: MuslimCordStorage): void {
  const cache = getCache(storage);
  for (const key of Object.keys(cache)) {
    if (!isSafeLocalAudioUri(cache[key])) {
      delete cache[key];
      if (storage.audioDownloadState) storage.audioDownloadState[key] = "not-downloaded";
    }
  }
}

let activeNativePlayer: any;
let activeWebPlayer: any;

function stopNativeAudio(): void {
  try { activeNativePlayer?.stop?.(); } catch { /* ignored */ }
  activeNativePlayer = undefined;
}

function stopWebAudio(): void {
  try { activeWebPlayer?.pause?.(); activeWebPlayer?.removeAttribute?.("src"); activeWebPlayer?.load?.(); } catch { /* ignored */ }
  activeWebPlayer = undefined;
}

function getNativeAudioSound(): any | undefined {
  try {
    return (findByProps("MobileAudioSound") as any)?.MobileAudioSound;
  } catch {
    return undefined;
  }
}

function playNativeAudio(url: string, onFailure?: () => void): boolean {
  if (!/^https?:\/\//i.test(url) && !isSafeLocalAudioUri(url)) return false;
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
  if (!/^https?:\/\//i.test(url) && !isSafeLocalAudioUri(url)) return false;
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
  const cached = storage.audioCache?.[id];
  return storage.audioDownloadState?.[id] === "downloaded" && isSafeLocalAudioUri(cached)
    ? "downloaded"
    : "not-downloaded";
}

export function getAudioProgress(storage: MuslimCordStorage, id: string): AudioProgress | undefined {
  return storage.audioDownloadProgress?.[id];
}

export async function downloadVoice(storage: MuslimCordStorage, voice: AudioVoice, variant: AdhanVariant, signal?: AbortSignal, onProgress?: (progress: AudioProgress) => void): Promise<boolean> {
  const target = getVoiceVariant(voice, variant);
  storage.audioDownloadState ??= {};
  storage.audioDownloadProgress ??= {};
  storage.audioDownloadError ??= {};
  storage.audioDownloadState[target.key] = "downloading";
  const initialProgress: AudioProgress = { loaded: 0, total: 0, percent: 0, speedBytesPerSecond: 0 };
  storage.audioDownloadProgress[target.key] = initialProgress;
  onProgress?.(initialProgress);
  delete storage.audioDownloadError[target.key];
  try {
    const response = await fetch(target.url, { cache: "force-cache", signal });
    if (!response.ok) throw new Error(`Audio download failed: ${response.status}`);
    const total = Number(response.headers.get("content-length") || 0);
    const startedAt = Date.now();
    let loaded = 0;
    const updateProgress = (value: number, totalBytes = total) => {
      const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
      const speedBytesPerSecond = Math.round(value / elapsedSeconds);
      const etaSeconds = totalBytes > value && speedBytesPerSecond > 0 ? Math.ceil((totalBytes - value) / speedBytesPerSecond) : undefined;
      const progress: AudioProgress = {
        loaded: value,
        total: totalBytes,
        percent: totalBytes ? Math.min(100, Math.round((value / totalBytes) * 100)) : 0,
        speedBytesPerSecond,
        etaSeconds,
      };
      storage.audioDownloadProgress![target.key] = progress;
      onProgress?.(progress);
    };
    let blob: Blob;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        if (signal?.aborted) throw new Error("Audio download cancelled");
        if (item.value) {
          chunks.push(item.value);
          loaded += item.value.byteLength;
          updateProgress(loaded);
        }
      }
      blob = new Blob(chunks as unknown as BlobPart[], { type: target.mime });
    } else {
      blob = await response.blob();
      loaded = blob.size;
      updateProgress(loaded, total || loaded);
    }
    delete getCache(storage)[target.key];
    await writeLocalAudio(storage, target.key, blob);
    updateProgress(loaded || blob.size, total || blob.size);
    storage.audioDownloadProgress[target.key] = { loaded: loaded || blob.size, total: total || blob.size, percent: 100, speedBytesPerSecond: storage.audioDownloadProgress[target.key]?.speedBytesPerSecond || 0 };
    storage.audioDownloadState[target.key] = "downloaded";
    return true;
  } catch (error) {
    delete getCache(storage)[target.key];
    storage.audioDownloadState[target.key] = "failed";
    storage.audioDownloadError[target.key] = String(error);
    return false;
  }
}

export async function downloadAllVoices(storage: MuslimCordStorage, signal?: AbortSignal, onItem?: (voice: AudioVoice, variant: AdhanVariant, completed: number, total: number) => void, onProgress?: (voice: AudioVoice, variant: AdhanVariant, progress: AudioProgress) => void): Promise<number> {
  let completed = 0;
  const total = AUDIO_VOICES.length * 2;
  for (const voice of AUDIO_VOICES) {
    for (const variant of ["normal", "fajr"] as const) {
      if (signal?.aborted) return completed;
      onItem?.(voice, variant, completed, total);
      if (await downloadVoice(storage, voice, variant, signal, (progress) => onProgress?.(voice, variant, progress))) completed += 1;
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
  playSource(target.url, target.mime, isSafeLocalAudioUri(cached) && cached !== target.url ? cached : undefined, onFailure);
}

export function playDownloadedAdhan(storage: MuslimCordStorage, voiceId: AdhanVoiceId, variant: AdhanVariant, onMissing?: () => void, onFailure?: () => void): boolean {
  const voice = getVoice(voiceId);
  const target = getVoiceVariant(voice, variant);
  const cached = getCache(storage)[target.key];
  if (!isSafeLocalAudioUri(cached) || cached === target.url) {
    onMissing?.();
    return false;
  }
  playSource(cached, target.mime, undefined, onFailure);
  return true;
}
