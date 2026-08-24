import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./Settings";
import { getLanguage, translations, type Language } from "./i18n";
import { fetchPrayerTimes, formatPrayerName, nextPrayer, resolveLocation, type Coordinates, type PrayerData, type PrayerName } from "./prayer";
import { AUDIO_VOICES, clearAudioCache, downloadAllVoices, downloadVoice, getAudioProgress as readAudioProgress, getAudioState as readAudioState, playReminderSound, sanitizeAudioCache, type AdhanVoiceId, type AdhanVariant, type AudioDownloadState, type AudioProgress, type AudioVoice, type SoundMode } from "./sound";

export type IntervalPreset = "30m" | "1h" | "2h" | "3h" | "custom";

export type MuslimCordStorage = {
  language: Language;
  enabled: boolean;
  prayerAlertsEnabled: boolean;
  duaaEnabled: boolean;
  salawatEnabled: boolean;
  locationQuery: string;
  selectedLocationId: string;
  location?: Coordinates;
  prayerData?: PrayerData;
  calculationMethod: number;
  duaaInterval: IntervalPreset;
  duaaCustomMinutes: number;
  salawatInterval: IntervalPreset;
  salawatCustomMinutes: number;
  reminderSound: SoundMode;
  adhanVoice: AdhanVoiceId;
  audioCache?: Record<string, string>;
  audioDownloadState?: Record<string, AudioDownloadState>;
  audioDownloadProgress?: Record<string, AudioProgress>;
  audioDownloadError?: Record<string, string>;
  lastDuaaAt: number;
  lastSalawatAt: number;
  nextDuaaAt: number;
  nextSalawatAt: number;
  salawatNotBefore: number;
  lastPrayerCheckMinute: string;
  lastPrayerAlerts: Record<string, string>;
};

export const vstorage = storage as MuslimCordStorage;

const DEFAULTS: MuslimCordStorage = {
  language: getLanguage(),
  enabled: true,
  prayerAlertsEnabled: true,
  duaaEnabled: true,
  salawatEnabled: true,
  locationQuery: "",
  selectedLocationId: "",
  calculationMethod: 3,
  duaaInterval: "30m",
  duaaCustomMinutes: 30,
  salawatInterval: "1h",
  salawatCustomMinutes: 60,
  reminderSound: "simple",
  adhanVoice: "ali-ahmed-mullah",
  audioCache: {},
  audioDownloadState: {},
  audioDownloadProgress: {},
  audioDownloadError: {},
  lastDuaaAt: Date.now(),
  lastSalawatAt: Date.now(),
  nextDuaaAt: Date.now() + 30 * 60_000,
  nextSalawatAt: Date.now() + 63 * 60_000,
  salawatNotBefore: Date.now() + 3 * 60_000,
  lastPrayerCheckMinute: "",
  lastPrayerAlerts: {},
};

let scheduler: ReturnType<typeof setTimeout> | undefined;
let refreshing = false;
let duaIndex = 0;
let salawatIndex = 0;
let activeAudioDownload: AudioDownloadSession | undefined;
let audioDownloadController: AbortController | undefined;
const audioDownloadListeners = new Set<() => void>();
let lastAudioProgressNotification = 0;

export type AudioDownloadSession = {
  mode: "selected" | "all";
  active: boolean;
  completed: number;
  total: number;
  voice?: AudioVoice;
  variant?: AdhanVariant;
  progress?: AudioProgress;
  result?: "completed" | "failed" | "cancelled";
};

function initializeStorage(): void {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if ((vstorage as any)[key] === undefined) (vstorage as any)[key] = value;
  }
  vstorage.lastPrayerAlerts ??= {};
  vstorage.audioCache ??= {};
  vstorage.audioDownloadState ??= {};
  vstorage.audioDownloadProgress ??= {};
  vstorage.audioDownloadError ??= {};
  // Migrate existing installations that only stored last-trigger timestamps.
  if (!Number.isFinite(vstorage.nextDuaaAt)) vstorage.nextDuaaAt = Date.now() + intervalMinutes(vstorage.duaaInterval, vstorage.duaaCustomMinutes) * 60_000;
  if (!Number.isFinite(vstorage.nextSalawatAt)) vstorage.nextSalawatAt = Date.now() + intervalMinutes(vstorage.salawatInterval, vstorage.salawatCustomMinutes) * 60_000 + 3 * 60_000;
  if (!Number.isFinite(vstorage.salawatNotBefore)) vstorage.salawatNotBefore = Date.now() + 3 * 60_000;
  if (!AUDIO_VOICES.some((voice) => voice.id === vstorage.adhanVoice)) vstorage.adhanVoice = "ali-ahmed-mullah";
  sanitizeAudioCache(vstorage);
}

export function language(): Language {
  return vstorage.language === "ar" || vstorage.language === "en" ? vstorage.language : getLanguage();
}

export function t() {
  return translations[language()];
}

export function intervalMinutes(preset: IntervalPreset, custom: number): number {
  if (preset === "30m") return 30;
  if (preset === "1h") return 60;
  if (preset === "2h") return 120;
  if (preset === "3h") return 180;
  return Math.max(5, Number(custom) || 30);
}

export function rescheduleReminders(from = Date.now()): void {
  vstorage.nextDuaaAt = from + intervalMinutes(vstorage.duaaInterval, vstorage.duaaCustomMinutes) * 60_000;
  vstorage.salawatNotBefore = from + 3 * 60_000;
  vstorage.nextSalawatAt = from + intervalMinutes(vstorage.salawatInterval, vstorage.salawatCustomMinutes) * 60_000 + 3 * 60_000;
  scheduleNextTick();
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function minuteKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
}

function formatCountdown(target: number): string {
  const remaining = Math.max(0, target - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getDuaaCountdown(): string {
  return formatCountdown(vstorage.nextDuaaAt || Date.now());
}

export function getSalawatCountdown(): string {
  return formatCountdown(vstorage.nextSalawatAt || Date.now());
}

function notify(title: string, content: string, confirmText: string): void {
  try {
    showConfirmationAlert({
      title,
      content,
      confirmText,
      cancelText: t().dismiss,
      onConfirm: () => showToast(confirmText),
    });
  } catch {
    showToast(`${title}: ${content}`);
  }
}

function triggerDuaa(): void {
  const localized = t();
  const content = localized.duaSamples[duaIndex++ % localized.duaSamples.length];
  const now = Date.now();
  vstorage.lastDuaaAt = now;
  vstorage.nextDuaaAt = now + intervalMinutes(vstorage.duaaInterval, vstorage.duaaCustomMinutes) * 60_000;
  vstorage.salawatNotBefore = now + 3 * 60_000;
  vstorage.nextSalawatAt = Math.max(vstorage.nextSalawatAt || 0, vstorage.salawatNotBefore);
  // Du'a uses only the lightweight notification sound; full adhan is reserved for prayer times.
  playReminderSound(vstorage, "simple");
  notify(localized.duaaReminder, content, localized.amin);
}

function triggerSalawat(): void {
  const localized = t();
  const content = localized.salawatSamples[salawatIndex++ % localized.salawatSamples.length];
  const now = Date.now();
  vstorage.lastSalawatAt = now;
  vstorage.nextSalawatAt = now + intervalMinutes(vstorage.salawatInterval, vstorage.salawatCustomMinutes) * 60_000;
  // Salawat reminders must never play the full adhan.
  playReminderSound(vstorage, "simple");
  notify(localized.salawatReminder, content, localized.prayed);
}

function triggerPrayer(prayer: PrayerName, time: string): void {
  const localized = t();
  const name = formatPrayerName(prayer, language());
  const key = `${todayKey()}-${prayer}`;
  if (vstorage.lastPrayerAlerts[key]) return;
  vstorage.lastPrayerAlerts[key] = new Date().toISOString();
  // Sunrise is a notification only; it must never play an adhan.
  const soundMode = prayer === "Sunrise" ? "simple" : vstorage.reminderSound;
  const variant: AdhanVariant = prayer === "Fajr" ? "fajr" : "normal";
  playReminderSound(vstorage, soundMode, vstorage.adhanVoice, variant, () => showToast(localized.audioPlaybackFailed));
  notify(`${localized.prayerReminder}: ${name}`, `${localized.prayerTimes}: ${time}`, localized.prayed);
}

function checkPrayerAlerts(): void {
  const data = vstorage.prayerData;
  if (!data || !vstorage.prayerAlertsEnabled) return;
  const currentMinute = minuteKey();
  if (vstorage.lastPrayerCheckMinute === currentMinute) return;
  vstorage.lastPrayerCheckMinute = currentMinute;
  const clock = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const prayers: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  prayers.forEach((prayer) => {
    if (data.times[prayer]?.startsWith(clock)) triggerPrayer(prayer, data.times[prayer]);
  });
}

function tick(): void {
  const now = Date.now();
  if (vstorage.enabled) {
    checkPrayerAlerts();
    if (vstorage.duaaEnabled && vstorage.nextDuaaAt <= now) triggerDuaa();
    if (vstorage.salawatEnabled && vstorage.nextSalawatAt <= now && now >= vstorage.salawatNotBefore) triggerSalawat();
  }
  if (vstorage.locationQuery && vstorage.prayerData && now - Number(vstorage.prayerData.fetchedAt || 0) > 12 * 60 * 60_000 && !refreshing) {
    void refreshPrayerData();
  }
  scheduleNextTick();
}

function scheduleNextTick(): void {
  if (scheduler) clearTimeout(scheduler);
  const now = Date.now();
  const candidates: number[] = [now + (vstorage.enabled ? 60_000 : 300_000)];
  if (vstorage.enabled && vstorage.prayerAlertsEnabled) candidates.push(now + (60_000 - (now % 60_000)) + 250);
  if (vstorage.enabled && vstorage.duaaEnabled) candidates.push(vstorage.nextDuaaAt);
  if (vstorage.enabled && vstorage.salawatEnabled) candidates.push(Math.max(vstorage.nextSalawatAt, vstorage.salawatNotBefore));
  if (vstorage.locationQuery && vstorage.prayerData) candidates.push(Number(vstorage.prayerData.fetchedAt || now) + 12 * 60 * 60_000);
  const nextAt = Math.min(...candidates.filter((value) => Number.isFinite(value) && value > now));
  scheduler = setTimeout(tick, Math.max(500, nextAt - now));
}

function startScheduler(): void {
  scheduleNextTick();
}

export async function refreshPrayerData(query = vstorage.locationQuery, locationId = vstorage.selectedLocationId): Promise<void> {
  if (refreshing) return;
  const localized = t();
  if (!query?.trim()) {
    showToast(localized.locationRequired);
    return;
  }
  refreshing = true;
  try {
    const coordinates = await resolveLocation(query);
    const prayerData = await fetchPrayerTimes(coordinates, vstorage.calculationMethod || 3);
    vstorage.locationQuery = query;
    vstorage.selectedLocationId = locationId || query;
    vstorage.location = coordinates;
    vstorage.prayerData = prayerData;
    showToast(`${localized.prayerTimes}: ${coordinates.label}`);
  } catch (error) {
    logger.error(`[MuslimCord] ${String(error)}`);
    showToast(localized.apiError);
  } finally {
    refreshing = false;
    scheduleNextTick();
  }
}

export async function saveLocation(query: string, locationId: string): Promise<void> {
  await refreshPrayerData(query, locationId);
}

export async function testDuaa(): Promise<void> {
  triggerDuaa();
}

export async function testSalawat(): Promise<void> {
  triggerSalawat();
}

function notifyAudioDownloadListeners(force = false): void {
  const now = Date.now();
  if (!force && now - lastAudioProgressNotification < 250) return;
  lastAudioProgressNotification = now;
  audioDownloadListeners.forEach((listener) => listener());
}

export function getAudioDownloadSession(): AudioDownloadSession | undefined {
  return activeAudioDownload;
}

export function subscribeAudioDownload(listener: () => void): () => void {
  audioDownloadListeners.add(listener);
  return () => audioDownloadListeners.delete(listener);
}

export function cancelAudioDownload(): void {
  audioDownloadController?.abort();
}

export function dismissAudioDownload(): void {
  if (!activeAudioDownload?.active) {
    activeAudioDownload = undefined;
    notifyAudioDownloadListeners(true);
  }
}

function finishAudioDownload(result: "completed" | "failed" | "cancelled"): void {
  if (!activeAudioDownload) return;
  activeAudioDownload.active = false;
  activeAudioDownload.result = result;
  audioDownloadController = undefined;
  notifyAudioDownloadListeners(true);
}

export async function downloadSelectedAudio(): Promise<void> {
  if (activeAudioDownload?.active) return;
  const voice = AUDIO_VOICES.find((item) => item.id === vstorage.adhanVoice) || AUDIO_VOICES[0];
  const AbortControllerCtor = (globalThis as any).AbortController as typeof AbortController | undefined;
  const controller = AbortControllerCtor ? new AbortControllerCtor() : undefined;
  audioDownloadController = controller;
  activeAudioDownload = { mode: "selected", active: true, completed: 0, total: 2, voice };
  notifyAudioDownloadListeners(true);
  let completed = 0;
  try {
    for (const variant of ["normal", "fajr"] as const) {
      if (controller?.signal.aborted) break;
      activeAudioDownload.voice = voice;
      activeAudioDownload.variant = variant;
      const success = await downloadVoice(vstorage, voice, variant, controller?.signal, (progress) => {
        if (activeAudioDownload) activeAudioDownload.progress = progress;
        notifyAudioDownloadListeners();
      });
      if (success) completed += 1;
      activeAudioDownload.completed = completed;
      notifyAudioDownloadListeners(true);
    }
    finishAudioDownload(controller?.signal.aborted ? "cancelled" : completed === 2 ? "completed" : "failed");
  } catch {
    finishAudioDownload(controller?.signal.aborted ? "cancelled" : "failed");
  }
  if (activeAudioDownload?.result === "completed") showToast(t().audioDownloaded);
  else if (activeAudioDownload?.result === "cancelled") showToast(t().downloadCancelled);
  else showToast(t().audioDownloadFailed);
}

export async function downloadAllAudio(): Promise<void> {
  if (activeAudioDownload?.active) return;
  showToast(t().downloadStarted);
  const AbortControllerCtor = (globalThis as any).AbortController as typeof AbortController | undefined;
  const controller = AbortControllerCtor ? new AbortControllerCtor() : undefined;
  audioDownloadController = controller;
  activeAudioDownload = { mode: "all", active: true, completed: 0, total: AUDIO_VOICES.length * 2 };
  notifyAudioDownloadListeners(true);
  let completed = 0;
  try {
    completed = await downloadAllVoices(
      vstorage,
      controller.signal,
      (voice, variant, done, total) => {
        if (activeAudioDownload) Object.assign(activeAudioDownload, { voice, variant, completed: done, total });
        notifyAudioDownloadListeners(true);
      },
      (voice, variant, progress) => {
        if (activeAudioDownload) Object.assign(activeAudioDownload, { voice, variant, progress });
        notifyAudioDownloadListeners();
      },
    );
    if (activeAudioDownload) activeAudioDownload.completed = completed;
    finishAudioDownload(controller?.signal.aborted ? "cancelled" : completed === AUDIO_VOICES.length * 2 ? "completed" : "failed");
  } catch {
    finishAudioDownload(controller?.signal.aborted ? "cancelled" : "failed");
  }
  if (activeAudioDownload?.result === "completed") showToast(`${t().audioDownloaded}: ${completed}/${AUDIO_VOICES.length * 2}`);
  else if (activeAudioDownload?.result === "cancelled") showToast(t().downloadCancelled);
  else showToast(t().audioDownloadFailed);
}

export function clearDownloadedAudio(): void {
  clearAudioCache(vstorage);
  showToast(t().audioCacheCleared);
}

export function getAudioState(id: string): AudioDownloadState {
  return readAudioState(vstorage, id);
}
export function getAudioProgress(id: string): AudioProgress | undefined {
  return readAudioProgress(vstorage, id);
}
export function getNextPrayerText(): string {
  const next = nextPrayer(vstorage.prayerData?.times);
  if (!next) return t().noTimes;
  return `${t().nextPrayer}: ${formatPrayerName(next.name, language())} — ${next.time}`;
}

export function onLoad(): void {
  initializeStorage();
  startScheduler();
  if (vstorage.locationQuery && !vstorage.prayerData) void refreshPrayerData();
  logger.log("MuslimCord loaded");
}

export function onUnload(): void {
  if (scheduler) clearTimeout(scheduler);
  scheduler = undefined;
  audioDownloadController?.abort();
  audioDownloadController = undefined;
  activeAudioDownload = undefined;
  logger.log("MuslimCord unloaded");
}

export const settings = Settings;
export default { onLoad, onUnload, settings };
