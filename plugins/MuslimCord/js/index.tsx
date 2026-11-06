import { React, ReactNative as RN } from '@valenced/react'
import { callNativeMethod } from '@valenced/modules/native'
import { getJsonStorage } from '@valenced/json-storage'

declare module '@valenced/modules/native' {
  interface NativeMethods {
    'com.snt.muslimcord.writeAudio': [[key: string, data: string], string]
    'com.snt.muslimcord.playAudio': [[key: string], void]
    'com.snt.muslimcord.stopAudio': [[], void]
  }
}

type Lang = 'ar' | 'en'
type Mode = 'simple' | 'adhan'
type Voice = 'ali' | 'mishary' | 'doha'
type Settings = {
  language: Lang; enabled: boolean; prayerAlerts: boolean; duaa: boolean; salawat: boolean
  location: string; calculationMethod: number; duaaMinutes: number; salawatMinutes: number
  sound: Mode; voice: Voice; nextDuaa: number; nextSalawat: number; salawatNotBefore: number
  prayerData?: { fetchedAt: number; times: Record<string, string>; label: string }
  lastPrayerKeys: Record<string, boolean>; audio: Record<string, boolean>
}

const defaults: Settings = {
  language: 'en', enabled: true, prayerAlerts: true, duaa: true, salawat: true,
  location: '', calculationMethod: 3, duaaMinutes: 30, salawatMinutes: 60, sound: 'simple', voice: 'ali',
  nextDuaa: Date.now() + 1_800_000, nextSalawat: Date.now() + 3_780_000, salawatNotBefore: Date.now() + 180_000,
  lastPrayerKeys: {}, audio: {},
}
const store = getJsonStorage<Settings>('storage.json', { default: defaults, load: true })
const voices = {
  ali: { normal: 'https://archive.org/download/MakkahAzan/12thNov09IshaAzanBySheikhAliAhmedMullah_512kb.mp4', fajr: 'https://archive.org/download/MakkahFajrAdhan6913SheikhAliMullah/Makkah%20Fajr%20Adhan%206-9-13%20Sheikh%20Ali%20Mullah.mp3', en: 'Sheikh Ali Ahmed Mullah', ar: 'الشيخ علي أحمد ملا' },
  mishary: { normal: 'https://media.assabile.com/assabile/adhan_3435370/e9ab8052fdb8.mp3', fajr: 'https://media.assabile.com/assabile/adhan_3435370/ddb21f7363eb.mp3', en: 'Sheikh Mishary Rashid Alafasy', ar: 'الشيخ مشاري راشد العفاسي' },
  doha: { normal: 'https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3', fajr: 'https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3', en: 'Doha, Qatar recording', ar: 'تسجيل عام من الدوحة، قطر' },
} as const
const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const arPrayer: Record<string, string> = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }
const text = {
  ar: { name: 'مسلم كورد', location: 'الموقع', save: 'حفظ وتحديث أوقات الصلاة', enable: 'تفعيل التذكيرات', prayerAlerts: 'تنبيهات أوقات الصلاة', duaa: 'تذكير الدعاء', salawat: 'الصلاة على النبي محمد ﷺ', sound: 'صوت الأذان', simple: 'صوت إشعار بسيط', adhan: 'الأذان', download: 'تنزيل الصوت المحدد', downloaded: 'تم التنزيل', downloadFailed: 'فشل التنزيل', language: 'اللغة', next: 'الصلاة القادمة', noTimes: 'لم يتم تحميل الأوقات بعد', about: 'تذكيرات إيمانية خفيفة وآمنة داخل Valenced.', test: 'اختبار الدعاء', stop: 'إيقاف جميع النوافذ', amin: 'آمين', prayed: 'صليت' },
  en: { name: 'MuslimCord', location: 'Location', save: 'Save and refresh prayer times', enable: 'Enable reminders', prayerAlerts: 'Prayer-time alerts', duaa: "Du'a reminder", salawat: 'Blessings upon Prophet Muhammad ﷺ', sound: 'Adhan sound', simple: 'Simple notification sound', adhan: 'Adhan', download: 'Download selected voice', downloaded: 'Downloaded', downloadFailed: 'Download failed', language: 'Language', next: 'Next prayer', noTimes: 'Prayer times are not loaded yet', about: 'Gentle, lightweight faith reminders for Valenced.', test: "Test du'a", stop: 'Stop all pop-ups', amin: 'Ameen', prayed: 'Prayed' },
} as const
const dua = { ar: ['اللهم أعني على ذكرك وشكرك وحسن عبادتك.', 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.', 'اللهم اغفر لي ولوالدي وللمؤمنين يوم يقوم الحساب.', 'يا مقلب القلوب ثبت قلبي على دينك.'], en: ['O Allah, help me remember You, thank You, and worship You well.', 'Our Lord, grant us good in this world and the Hereafter, and protect us from the Fire.', 'O Allah, forgive me, my parents, and the believers.', 'O Turner of hearts, keep my heart firm upon Your religion.'] }
const salawat = { ar: 'اللهم صل وسلم وبارك على نبينا محمد ﷺ.', en: 'O Allah, send prayers, peace, and blessings upon our Prophet Muhammad ﷺ.' }
let timer: ReturnType<typeof setTimeout> | undefined
let index = 0
function current(): Settings { return (store.cache as Settings | undefined) ?? defaults }
async function patch(value: Partial<Settings>) { await store.set(value) }
function t(s = current()) { return text[s.language] }
function notify(title: string, body: string, button: string) { RN.Alert.alert(title, body, [{ text: button }, { text: current().language === 'ar' ? 'إغلاق' : 'Dismiss' }]) }
function schedule() { if (timer) clearTimeout(timer); const s = current(); const due = Math.min(s.enabled ? s.nextDuaa : Infinity, s.enabled ? s.nextSalawat : Infinity, Date.now() + 60_000); timer = setTimeout(tick, Math.max(500, due - Date.now())) }
function tick() { const s = current(); const now = Date.now(); if (s.enabled) { if (s.duaa && s.nextDuaa <= now) { notify(t(s).duaa, dua[s.language][index++ % dua[s.language].length], t(s).amin); void patch({ nextDuaa: now + s.duaaMinutes * 60_000, salawatNotBefore: now + 180_000, nextSalawat: Math.max(s.nextSalawat, now + 180_000) }) } if (s.salawat && s.nextSalawat <= now && now >= s.salawatNotBefore) { notify(t(s).salawat, salawat[s.language], t(s).prayed); void patch({ nextSalawat: now + s.salawatMinutes * 60_000 }) } checkPrayers(s) } schedule() }
function checkPrayers(s: Settings) { if (!s.prayerAlerts || !s.prayerData) return; const now = new Date(); const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; for (const prayer of prayers) if (s.prayerData.times[prayer]?.startsWith(clock)) { const key = `${now.toDateString()}-${prayer}`; if (s.lastPrayerKeys[key]) continue; s.lastPrayerKeys[key] = true; const name = s.language === 'ar' ? arPrayer[prayer] : prayer; notify(`${s.language === 'ar' ? 'تذكير بالصلاة' : 'Prayer reminder'}: ${name}`, s.prayerData.times[prayer], s.language === 'ar' ? 'صليت' : 'Prayed'); if (prayer !== 'Sunrise' && s.sound === 'adhan') void playAdhan(prayer === 'Fajr' ? 'fajr' : 'normal') } }
async function refreshPrayerTimes(s: Settings) { if (!s.location.trim()) return; const q = encodeURIComponent(s.location.trim()); const geo = await (await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${q}`, { headers: { Accept: 'application/json' } })).json() as Array<{ lat: string; lon: string; display_name: string }>; if (!geo[0]) throw new Error('Location not found'); const date = new Date(); const d = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`; const payload = await (await fetch(`https://api.aladhan.com/v1/timings/${d}?latitude=${geo[0].lat}&longitude=${geo[0].lon}&method=${s.calculationMethod}`)).json() as any; const times: Record<string, string> = {}; for (const p of prayers) times[p] = String(payload.data.timings[p] ?? '').split(' ')[0]; await patch({ prayerData: { fetchedAt: Date.now(), times, label: geo[0].display_name } }); RN.Alert.alert(t(s).location, t(s).save) }
function bytesToBase64(input: ArrayBuffer) { const bytes = new Uint8Array(input); let out = ''; const step = 0x8000; for (let i = 0; i < bytes.length; i += step) out += String.fromCharCode(...bytes.subarray(i, i + step)); return btoa(out) }
async function download(variant: 'normal' | 'fajr') { const s = current(); const voice = voices[s.voice]; const key = `${s.voice}:${variant}`; try { const response = await fetch(voice[variant]); if (!response.ok) throw new Error(String(response.status)); const data = await response.arrayBuffer(); await callNativeMethod(`${PLUGIN_ID}.writeAudio`, [key, bytesToBase64(data)]); await patch({ audio: { ...s.audio, [key]: true } }); RN.Alert.alert(t(s).sound, t(s).downloaded) } catch { RN.Alert.alert(t(s).sound, t(s).downloadFailed) } }
async function playAdhan(variant: 'normal' | 'fajr') { const s = current(); const key = `${s.voice}:${variant}`; if (!s.audio[key]) return; try { await callNativeMethod(`${PLUGIN_ID}.playAudio`, [key]) } catch { /* native fallback intentionally silent */ } }
const PLUGIN_ID = 'com.snt.muslimcord'
function Settings({ api }: { api: any }) { const s = (api.jsonStorage.use() as Settings | undefined) ?? defaults; const l = text[s.language]; const set = (value: Partial<Settings>) => void patch(value); const times = s.prayerData?.times; return <RN.ScrollView style={{ flex: 1, padding: 16 }}><RN.Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>{l.name}</RN.Text><RN.Text style={{ marginBottom: 16 }}>{l.about}</RN.Text><RN.Text>{l.language}</RN.Text><RN.Button title="العربية" onPress={() => set({ language: 'ar' })} /><RN.Button title="English" onPress={() => set({ language: 'en' })} /><RN.Text style={{ marginTop: 16 }}>{l.location}</RN.Text><RN.TextInput value={s.location} onChangeText={(v: string) => set({ location: v })} placeholder={s.language === 'ar' ? 'المدينة، الدولة' : 'City, country'} style={{ borderWidth: 1, padding: 10, marginVertical: 8 }} /><RN.Button title={l.save} onPress={() => void refreshPrayerTimes(current())} /><RN.Text style={{ marginTop: 16 }}>{times ? Object.entries(times).map(([p, time]) => <RN.Text key={p}>{s.language === 'ar' ? arPrayer[p] : p}: {time}\n</RN.Text>) : l.noTimes}</RN.Text><RN.Button title={l.enable} onPress={() => set({ enabled: !s.enabled })} /><RN.Button title={l.prayerAlerts} onPress={() => set({ prayerAlerts: !s.prayerAlerts })} /><RN.Button title={l.duaa} onPress={() => set({ duaa: !s.duaa })} /><RN.Button title={l.salawat} onPress={() => set({ salawat: !s.salawat })} /><RN.Text style={{ marginTop: 16 }}>{l.sound}</RN.Text><RN.Button title={l.simple} onPress={() => set({ sound: 'simple' })} /><RN.Button title={l.adhan} onPress={() => set({ sound: 'adhan' })} /><RN.Button title={`${l.download} (${s.voice})`} onPress={() => void download('normal').then(() => download('fajr'))} /><RN.Button title={l.test} onPress={() => notify(l.duaa, dua[s.language][0], l.amin)} /><RN.Button title={l.stop} onPress={() => set({ enabled: false })} /></RN.ScrollView> }
export default plugin({ jsonStorage: { default: defaults, load: true }, start() { schedule() }, stop() { if (timer) clearTimeout(timer); void callNativeMethod(`${PLUGIN_ID}.stopAudio`, []) }, SettingsComponent: Settings })
