import { ReactNative as RN, React, url } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";
import { cancelAudioDownload, dismissAudioDownload, getAudioDownloadSession, getAudioProgress, getAudioState, getDuaaCountdown, getNextPrayerText, getSalawatCountdown, language, rescheduleReminders, saveLocation, subscribeAudioDownload, testDuaa, testSalawat, t, vstorage, downloadAllAudio, downloadSelectedAudio, clearDownloadedAudio, type AudioDownloadSession, type IntervalPreset } from ".";
import { formatPrayerName, type PrayerName } from "./prayer";
import { AUDIO_VOICES, type AdhanVoiceId, type SoundMode } from "./sound";

const { FormRow, FormText, FormInput, FormRadioRow, FormSwitchRow } = Forms;
const LOCATION_HELP_URL = "https://www.openstreetmap.org/search";

const intervals: Array<{ value: IntervalPreset; ar: string; en: string }> = [
  { value: "30m", ar: "30 دقيقة", en: "30 minutes" },
  { value: "1h", ar: "ساعة واحدة", en: "1 hour" },
  { value: "2h", ar: "ساعتان", en: "2 hours" },
  { value: "3h", ar: "3 ساعات", en: "3 hours" },
  { value: "custom", ar: "مخصص", en: "Custom" },
];

const sounds: Array<{ value: SoundMode; ar: string; en: string }> = [
  { value: "simple", ar: "صوت إشعار بسيط", en: "Simple notification sound" },
  { value: "adhan", ar: "الأذان", en: "Adhan" },
];

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "—";
  const value = Math.max(0, Math.ceil(seconds));
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  if (minutes < 60) return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function formatSpeed(bytesPerSecond: number | undefined): string {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond)) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

function downloadLabel(state: string, progress: ReturnType<typeof getAudioProgress>, localized: ReturnType<typeof t>): string {
  if (state === "downloading") {
    const percent = progress?.percent ? `${progress.percent}%` : localized.downloadPreparing;
    const size = progress?.loaded ? ` · ${formatBytes(progress.loaded)}${progress.total ? ` / ${formatBytes(progress.total)}` : ""}` : "";
    return `${localized.downloading} ${percent}${size}`;
  }
  if (state === "downloaded") return localized.downloaded;
  if (state === "failed") return localized.downloadFailedState;
  return localized.notDownloaded;
}

function IntervalRows({ value, onChange, isArabic }: { value: IntervalPreset; onChange: (value: IntervalPreset) => void; isArabic: boolean }) {
  return (
    <>
      {intervals.map((option) => (
        <FormRadioRow key={option.value} label={isArabic ? option.ar : option.en} onPress={() => onChange(option.value)} selected={value === option.value} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />
      ))}
    </>
  );
}

function ActionRow({ label, onPress, subLabel }: { label: string; onPress: () => void; subLabel?: string }) {
  return <FormRow label={label} subLabel={subLabel} onPress={onPress} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />;
}

function DownloadProgressModal({ session, isArabic }: { session?: AudioDownloadSession; isArabic: boolean }) {
  if (!session) return null;
  const localized = t();
  const progress = session.progress;
  const itemPercent = Math.max(0, Math.min(100, progress?.percent || 0));
  const overallPercent = session.total > 0
    ? Math.max(0, Math.min(100, Math.round(((session.completed + (session.active ? itemPercent / 100 : 0)) / session.total) * 100)))
    : 0;
  const voiceName = session.voice ? (isArabic ? session.voice.nameAr : session.voice.name) : localized.downloadPreparing;
  const variantName = session.variant === "fajr" ? localized.fajrAdhan : session.variant === "normal" ? localized.normalAdhan : "";
  const status = session.active
    ? `${localized.downloading} ${itemPercent}%`
    : session.result === "completed" ? localized.downloadComplete : session.result === "cancelled" ? localized.downloadCancelled : localized.audioDownloadFailed;
  const closeOrCancel = () => session.active ? cancelAudioDownload() : dismissAudioDownload();
  return (
    <RN.Modal visible animationType="fade" transparent onRequestClose={closeOrCancel}>
      <RN.View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.72)" }}>
        <RN.View style={{ borderRadius: 16, padding: 20, backgroundColor: "#112032" }}>
          <RN.Text style={{ color: "#f8fafc", fontSize: 20, fontWeight: "700", textAlign: isArabic ? "right" : "left" }}>{localized.downloadProgress}</RN.Text>
          <RN.Text style={{ marginTop: 14, color: "#cbd5e1", textAlign: isArabic ? "right" : "left" }}>{localized.downloadFile}: {voiceName}{variantName ? ` · ${variantName}` : ""}</RN.Text>
          <RN.Text style={{ marginTop: 8, color: "#cbd5e1", textAlign: isArabic ? "right" : "left" }}>{localized.downloadOverall}: {overallPercent}% · {session.completed}/{session.total}</RN.Text>
          <RN.View style={{ height: 12, marginTop: 12, overflow: "hidden", borderRadius: 8, backgroundColor: "#24364b" }}>
            <RN.View style={{ width: `${overallPercent}%`, height: "100%", borderRadius: 8, backgroundColor: "#34d399" }} />
          </RN.View>
          <RN.Text style={{ marginTop: 14, color: "#a7f3d0", textAlign: isArabic ? "right" : "left" }}>{status}</RN.Text>
          <RN.Text style={{ marginTop: 6, color: "#cbd5e1", textAlign: isArabic ? "right" : "left" }}>{localized.downloadTransferred}: {formatBytes(progress?.loaded || 0)} / {progress?.total ? formatBytes(progress.total) : "—"}</RN.Text>
          <RN.Text style={{ marginTop: 6, color: "#cbd5e1", textAlign: isArabic ? "right" : "left" }}>{localized.downloadSpeed}: {formatSpeed(progress?.speedBytesPerSecond)}</RN.Text>
          <RN.Text style={{ marginTop: 6, color: "#cbd5e1", textAlign: isArabic ? "right" : "left" }}>{localized.downloadEta}: {formatDuration(progress?.etaSeconds)}</RN.Text>
          <ActionRow label={session.active ? localized.downloadCancel : localized.downloadDismiss} onPress={closeOrCancel} />
        </RN.View>
      </RN.View>
    </RN.Modal>
  );
}

function LocationModal({ visible, isArabic, onClose }: { visible: boolean; isArabic: boolean; onClose: () => void }) {
  const localized = t();
  const [query, setQuery] = React.useState(vstorage.locationQuery || "");

  React.useEffect(() => {
    if (visible) setQuery(vstorage.locationQuery || "");
  }, [visible]);

  const save = () => {
    const value = query.trim();
    if (!value) return;
    onClose();
    void saveLocation(value, value);
  };

  return (
    <RN.Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <RN.View style={{ flex: 1, paddingTop: 40, backgroundColor: "#101827" }}>
        <FormRow label={localized.chooseLocation} onPress={onClose} trailing={<FormRow.Arrow />} />
        <FormText>{localized.locationInputHint}</FormText>
        <ActionRow label={localized.openLocationWebsite} subLabel="OpenStreetMap — openstreetmap.org" onPress={() => { void url.openURL(LOCATION_HELP_URL); }} />
        <RN.TextInput value={query} onChangeText={setQuery} placeholder={localized.locationPlaceholder} placeholderTextColor="#94a3b8" autoCapitalize="words" autoCorrect={false} style={{ margin: 12, padding: 14, borderRadius: 10, backgroundColor: "#1e293b", color: "#f8fafc" }} />
        <FormText>{localized.locationPasteHint}</FormText>
        <ActionRow label={localized.saveLocation} subLabel={query.trim() || localized.locationRequired} onPress={save} />
      </RN.View>
    </RN.Modal>
  );
}

export default function Settings() {
  useProxy(vstorage);
  const isArabic = language() === "ar";
  const localized = t();
  const data = vstorage.prayerData;
  const [locationModalVisible, setLocationModalVisible] = React.useState(false);
  const [audioDownload, setAudioDownload] = React.useState<AudioDownloadSession | undefined>(getAudioDownloadSession());
  const [, setNow] = React.useState(Date.now());
  const prayerNames: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const updateDownload = () => {
      const current = getAudioDownloadSession();
      setAudioDownload(current ? { ...current, progress: current.progress ? { ...current.progress } : undefined } : undefined);
    };
    return subscribeAudioDownload(updateDownload);
  }, []);

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <LocationModal visible={locationModalVisible} isArabic={isArabic} onClose={() => setLocationModalVisible(false)} />
      <DownloadProgressModal session={audioDownload} isArabic={isArabic} />
      <FormText>{localized.aboutText}</FormText>
      <FormText>{localized.author}</FormText>
      <FormRow label={localized.language} />
      <FormRadioRow label="العربية" selected={vstorage.language === "ar"} onPress={() => (vstorage.language = "ar")} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />
      <FormRadioRow label="English" selected={vstorage.language === "en"} onPress={() => (vstorage.language = "en")} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />
      <FormRow label={localized.location} subLabel={vstorage.location?.label || localized.defaultLocation} />
      <ActionRow label={localized.chooseLocation} subLabel={vstorage.location?.label || localized.defaultLocation} onPress={() => setLocationModalVisible(true)} />
      <FormRow label={localized.prayerTimes} subLabel={getNextPrayerText()} />
      {data ? prayerNames.map((name) => <FormRow key={name} label={formatPrayerName(name, language())} subLabel={data.times[name] || "—"} style={{ marginHorizontal: 12 }} />) : <FormText>{localized.noTimes}</FormText>}
      <FormRow label={localized.reminderSettings} />
      <FormSwitchRow label={localized.enabled} value={vstorage.enabled} onValueChange={(value: boolean) => (vstorage.enabled = value)} />
      <FormSwitchRow label={localized.prayerAlertsEnabled} value={vstorage.prayerAlertsEnabled} onValueChange={(value: boolean) => (vstorage.prayerAlertsEnabled = value)} />
      <FormText>{localized.stopAllReminders}: {vstorage.enabled ? localized.enabled : localized.stopped}</FormText>
      <FormRow label={localized.duaaReminder} subLabel={`${localized.countdownDuaa}: ${getDuaaCountdown()}`} />
      <IntervalRows value={vstorage.duaaInterval} onChange={(value) => { vstorage.duaaInterval = value; rescheduleReminders(); }} isArabic={isArabic} />
      {vstorage.duaaInterval === "custom" && <FormInput title={localized.customMinutes} keyboardType="numeric" value={String(vstorage.duaaCustomMinutes)} onChange={(value: string) => { vstorage.duaaCustomMinutes = Math.max(5, Number(value) || 5); rescheduleReminders(); }} style={{ marginHorizontal: 12 }} />}
      <FormRow label={localized.salawatReminder} subLabel={`${localized.countdownSalawat}: ${getSalawatCountdown()}`} />
      <FormText>{localized.salawatDelay}</FormText>
      <IntervalRows value={vstorage.salawatInterval} onChange={(value) => { vstorage.salawatInterval = value; rescheduleReminders(); }} isArabic={isArabic} />
      {vstorage.salawatInterval === "custom" && <FormInput title={localized.customMinutes} keyboardType="numeric" value={String(vstorage.salawatCustomMinutes)} onChange={(value: string) => { vstorage.salawatCustomMinutes = Math.max(5, Number(value) || 5); rescheduleReminders(); }} style={{ marginHorizontal: 12 }} />}
      <FormRow label={localized.notificationSound} />
      {sounds.map((sound) => <FormRadioRow key={sound.value} label={isArabic ? sound.ar : sound.en} selected={vstorage.reminderSound === sound.value} onPress={() => (vstorage.reminderSound = sound.value)} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />)}
      {vstorage.reminderSound === "adhan" && <>
        <FormRow label={localized.adhanVoice} />
        {AUDIO_VOICES.map((voice) => {
          const normalState = getAudioState(`${voice.id}:normal`);
          const normalProgress = getAudioProgress(`${voice.id}:normal`);
          const fajrState = getAudioState(`${voice.id}:fajr`);
          const fajrProgress = getAudioProgress(`${voice.id}:fajr`);
          const status = `${localized.normalAdhan}: ${downloadLabel(normalState, normalProgress, localized)} · ${localized.fajrAdhan}: ${downloadLabel(fajrState, fajrProgress, localized)}`;
          return <FormRadioRow key={voice.id} label={isArabic ? voice.nameAr : voice.name} subLabel={`${status} · ${voice.attribution}`} selected={vstorage.adhanVoice === voice.id} onPress={() => (vstorage.adhanVoice = voice.id as AdhanVoiceId)} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />;
        })}
      </>}
      <FormRow label={localized.audioSection} subLabel={localized.audioProgressHint} />
      <ActionRow label={localized.downloadVoice} onPress={() => void downloadSelectedAudio()} />
      <ActionRow label={localized.downloadAll} onPress={() => void downloadAllAudio()} />
      <ActionRow label={localized.clearDownloads} onPress={clearDownloadedAudio} />
      <FormRow label={localized.testSection} />
      <ActionRow label={localized.testDuaa} onPress={() => void testDuaa()} />
      <ActionRow label={localized.testSalawat} onPress={() => void testSalawat()} />
      <FormText>{localized.stopAllReminders}: {vstorage.enabled ? localized.enabled : localized.stopped}</FormText>
    </RN.ScrollView>
  );
}
