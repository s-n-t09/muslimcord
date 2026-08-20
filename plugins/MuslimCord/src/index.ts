import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./Settings";
import { getLanguage, translations, type Language } from "./i18n";
import { fetchPrayerTimes, formatPrayerName, nextPrayer, resolveLocation, type Coordinates, type PrayerData, type PrayerName } from "./prayer";
import { AUDIO_VOICES, clearAudioCache, downloadAllVoices, downloadVoice, getAudioProgress as readAudioProgress, getAudioState as readAudioState, playReminderSound, type AdhanVoiceId, type AudioDownloadState, type AudioProgress, type SoundMode } from "./sound";

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

let scheduler: ReturnType<typeof setInterval> | undefined;
let refreshing = false;
let duaIndex = 0;
let salawatIndex = 0;

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
  vstorage.adhanVoice ??= "ali-ahmed-mullah";
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
  playReminderSound(vstorage, vstorage.reminderSound, undefined, () => showToast(localized.audioPlaybackFailed));
  notify(localized.duaaReminder, content, localized.amin);
}

function triggerSalawat(): void {
  const localized = t();
  const content = localized.salawatSamples[salawatIndex++ % localized.salawatSamples.length];
  const now = Date.now();
  vstorage.lastSalawatAt = now;
  vstorage.nextSalawatAt = now + intervalMinutes(vstorage.salawatInterval, vstorage.salawatCustomMinutes) * 60_000;
  playReminderSound(vstorage, vstorage.reminderSound, undefined, () => showToast(localized.audioPlaybackFailed));
  notify(localized.salawatReminder, content, localized.prayed);
}

function triggerPrayer(prayer: PrayerName, time: string, index: number): void {
  const localized = t();
  const name = formatPrayerName(prayer, language());
  const key = `${todayKey()}-${prayer}`;
  if (vstorage.lastPrayerAlerts[key]) return;
  vstorage.lastPrayerAlerts[key] = new Date().toISOString();
  playReminderSound(vstorage, vstorage.reminderSound, undefined, () => showToast(localized.audioPlaybackFailed));
  notify(`${localized.prayerReminder}: ${name}`, `${localized.prayerTimes}: ${time}`, localized.prayed);
}

function checkPrayerAlerts(): void {
  const data = vstorage.prayerData;
  if (!data || !vstorage.prayerAlertsEnabled) return;
  const currentMinute = minuteKey();
  if (vstorage.lastPrayerCheckMinute === currentMinute) return;
  vstorage.lastPrayerCheckMinute = currentMinute;
  const clock = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const prayers: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  prayers.forEach((prayer, index) => {
    if (data.times[prayer]?.startsWith(clock)) triggerPrayer(prayer, data.times[prayer], index);
  });
}

function tick(): void {
  if (!vstorage.enabled) return;
  checkPrayerAlerts();
  const now = Date.now();
  if (vstorage.duaaEnabled && vstorage.nextDuaaAt <= now) triggerDuaa();
  if (vstorage.salawatEnabled && vstorage.nextSalawatAt <= now && now >= vstorage.salawatNotBefore) triggerSalawat();
  if (vstorage.locationQuery && (!vstorage.prayerData || now - Number(vstorage.prayerData.fetchedAt || 0) > 12 * 60 * 60_000)) void refreshPrayerData();
}

function startScheduler(): void {
  if (scheduler) clearInterval(scheduler);
  scheduler = setInterval(tick, 1_000);
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

export function testAdhan(): void {
  playReminderSound(vstorage, "adhan", undefined, () => showToast(t().audioPlaybackFailed));
  showToast(t().audioPlaybackStarted);
}

export async function downloadSelectedAudio(): Promise<void> {
  const voice = AUDIO_VOICES.find((item) => item.id === vstorage.adhanVoice) || AUDIO_VOICES[0];
  const success = await downloadVoice(vstorage, voice);
  showToast(success ? t().audioDownloaded : t().audioDownloadFailed);
}

export async function downloadAllAudio(): Promise<void> {
  showToast(t().downloadStarted);
  const completed = await downloadAllVoices(vstorage);
  showToast(`${t().audioDownloaded}: ${completed}/${AUDIO_VOICES.length}`);
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
  if (scheduler) clearInterval(scheduler);
  scheduler = undefined;
  logger.log("MuslimCord unloaded");
}

export const settings = Settings;
export default { onLoad, onUnload, settings };
