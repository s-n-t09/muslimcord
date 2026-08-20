export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export type Coordinates = {
  latitude: number;
  longitude: number;
  label: string;
};

export type PrayerTimes = Record<PrayerName, string> & {
  date: string;
  timezone?: string;
};

export type PrayerData = {
  coordinates: Coordinates;
  times: PrayerTimes;
  fetchedAt: number;
};

const API_BASE = "https://api.aladhan.com/v1/timings";
const GEOCODE_BASE = "https://nominatim.openstreetmap.org/search";
const PRAYERS: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

function ensureNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid coordinates");
  return parsed;
}

export async function resolveLocation(query: string): Promise<Coordinates> {
  const value = query.trim();
  if (!value) throw new Error("Location is required");

  const coordinateMatch = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinateMatch) {
    const latitude = ensureNumber(coordinateMatch[1]);
    const longitude = ensureNumber(coordinateMatch[2]);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error("Coordinates are out of range");
    }
    return { latitude, longitude, label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` };
  }

  const response = await fetch(`${GEOCODE_BASE}?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(value)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first) throw new Error("Location not found");
  return {
    latitude: ensureNumber(first.lat),
    longitude: ensureNumber(first.lon),
    label: String(first.display_name || value),
  };
}

export async function fetchPrayerTimes(coordinates: Coordinates, calculationMethod = 3): Promise<PrayerData> {
  const date = new Date();
  const day = [date.getDate(), date.getMonth() + 1, date.getFullYear()].map((part) => String(part).padStart(2, "0")).join("-");
  const url = `${API_BASE}/${day}?latitude=${encodeURIComponent(coordinates.latitude)}&longitude=${encodeURIComponent(coordinates.longitude)}&method=${calculationMethod}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Prayer API failed: ${response.status}`);
  const payload = await response.json();
  if (payload?.code !== 200 || !payload?.data?.timings) throw new Error("Prayer API returned no timings");

  const times = {} as PrayerTimes;
  for (const prayer of PRAYERS) {
    const raw = String(payload.data.timings[prayer] ?? "").split(" ")[0];
    if (raw) times[prayer] = raw;
  }
  times.date = String(payload.data.date?.readable ?? day);
  times.timezone = String(payload.data.meta?.timezone ?? "");
  return { coordinates, times, fetchedAt: Date.now() };
}

export function nextPrayer(times?: PrayerTimes): { name: PrayerName; time: string } | null {
  if (!times) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates = PRAYERS
    .filter((name) => Boolean(times[name]))
    .map((name) => {
      const [hours, minutes] = times[name].split(":").map(Number);
      return { name, time: times[name], minutes: hours * 60 + minutes };
    });
  return candidates.find((candidate) => candidate.minutes > nowMinutes) ?? candidates[0] ?? null;
}

export function formatPrayerName(name: PrayerName, language: "ar" | "en"): string {
  if (language === "ar") {
    return ({ Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" } as Record<PrayerName, string>)[name];
  }
  return ({ Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" } as Record<PrayerName, string>)[name];
}
