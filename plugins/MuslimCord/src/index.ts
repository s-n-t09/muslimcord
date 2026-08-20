import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./Settings";
import { getLanguage, translations, type Language } from "./i18n";
import { fetchPrayerTimes, formatPrayerName, nextPrayer, resolveLocation, type Coordinates, type PrayerData, type PrayerName, type PrayerTimes } from "./prayer";
import { playReminderSound, type SoundMode } from "./sound";

export type IntervalPreset = "30m" | "1h" | "2h" | "3h" | "custom";

export type MuslimCordStorage = {
  language: Language;
  enabled: boolean;
  prayerAlertsEnabled: boolean;
  duaaEnabled: boolean;
  salawatEnabled: boolean;
  locationQuery: string;
  location?: Coordinates;
  prayerData?: PrayerData;
  calculationMethod: number;
  duaaInterval: IntervalPreset;
  duaaCustomMinutes: number;
  salawatInterval: IntervalPreset;
  salawatCustomMinutes: number;
  reminderSound: SoundMode;
  lastDuaaAt: number;
  lastSalawatAt: number;
  salawatNotBefore: number;
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
  calculationMethod: 3,
  duaaInterval: "30m",
  duaaCustomMinutes: 30,
  salawatInterval: "1h",
  salawatCustomMinutes: 60,
  reminderSound: "simple",
  lastDuaaAt: Date.now(),
  lastSalawatAt: Date.now(),
  salawatNotBefore: Date.now(),
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
}

export function language(): Language {
  return vstorage.language === "ar" || vstorage.language === "en" ? vstorage.language : getLanguage();
}

export function t() {
  return translations[language()];
}

function intervalMinutes(preset: IntervalPreset, custom: number): number {
  if (preset === "30m") return 30;
  if (preset === "1h") return 60;
  if (preset === "2h") return 120;
  if (preset === "3h") return 180;
  return Math.max(5, Number(custom) || 30);
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
  vstorage.lastDuaaAt = Date.now();
  vstorage.salawatNotBefore = Date.now() + 3 * 60_000;
  playReminderSound(vstorage.reminderSound);
  notify(localized.duaaReminder, content, localized.amin);
}

function triggerSalawat(): void {
  const localized = t();
  const content = localized.salawatSamples[salawatIndex++ % localized.salawatSamples.length];
  vstorage.lastSalawatAt = Date.now();
  playReminderSound(vstorage.reminderSound);
  notify(localized.salawatReminder, content, localized.prayed);
}

function triggerPrayer(prayer: PrayerName, time: string, index: number): void {
  const localized = t();
  const name = formatPrayerName(prayer, language());
  const key = `${todayKey()}-${prayer}`;
  if (vstorage.lastPrayerAlerts[key]) return;
  vstorage.lastPrayerAlerts[key] = new Date().toISOString();
  playReminderSound(vstorage.reminderSound, index);
  notify(`${localized.prayerReminder}: ${name}`, `${localized.prayerTimes}: ${time}`, localized.prayed);
}

function checkPrayerAlerts(): void {
  const data = vstorage.prayerData;
  if (!data || !vstorage.prayerAlertsEnabled) return;
  const clock = currentTime();
  const prayers: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  prayers.forEach((prayer, index) => {
    if (data.times[prayer]?.startsWith(clock)) triggerPrayer(prayer, data.times[prayer], index);
  });
}

function tick(): void {
  if (!vstorage.enabled) return;
  if (vstorage.locationQuery && (!vstorage.prayerData || Date.now() - Number(vstorage.prayerData.fetchedAt || 0) > 12 * 60 * 60_000)) {
    void refreshPrayerData();
  }
  checkPrayerAlerts();
  const now = Date.now();
  if (vstorage.duaaEnabled && now - Number(vstorage.lastDuaaAt || 0) >= intervalMinutes(vstorage.duaaInterval, vstorage.duaaCustomMinutes) * 60_000) triggerDuaa();
  if (vstorage.salawatEnabled && now >= Number(vstorage.salawatNotBefore || 0) && now - Number(vstorage.lastSalawatAt || 0) >= intervalMinutes(vstorage.salawatInterval, vstorage.salawatCustomMinutes) * 60_000) triggerSalawat();
}

function startScheduler(): void {
  if (scheduler) clearInterval(scheduler);
  scheduler = setInterval(tick, 60_000);
}

export async function refreshPrayerData(query = vstorage.locationQuery): Promise<void> {
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

export async function useDeviceLocation(): Promise<void> {
  const geolocation = (globalThis as any)?.navigator?.geolocation;
  if (!geolocation) {
    showToast(t().locationRequired);
    return;
  }
  geolocation.getCurrentPosition(
    async (position: any) => {
      const query = `${position.coords.latitude}, ${position.coords.longitude}`;
      await refreshPrayerData(query);
    },
    () => showToast(t().locationRequired),
    { enableHighAccuracy: false, timeout: 10_000 },
  );
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
