import { ReactNative as RN, React } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";
import { getDuaaCountdown, getNextPrayerText, getSalawatCountdown, language, rescheduleReminders, saveLocation, testAdhan, testDuaa, testSalawat, testTakbeer, t, vstorage, downloadAllAudio, downloadSelectedAudio, clearDownloadedAudio, getAudioState, type IntervalPreset } from ".";
import { formatPrayerName, type PrayerName } from "./prayer";
import { LOCATION_OPTIONS, searchLocations, type LocationOption } from "./locations";
import { AUDIO_VOICES, TAKBEER_VOICE, type AdhanVoiceId, type SoundMode } from "./sound";

const { FormRow, FormText, FormInput, FormRadioRow, FormSwitchRow } = Forms;

const intervals: Array<{ value: IntervalPreset; ar: string; en: string }> = [
  { value: "30m", ar: "30 دقيقة", en: "30 minutes" },
  { value: "1h", ar: "ساعة واحدة", en: "1 hour" },
  { value: "2h", ar: "ساعتان", en: "2 hours" },
  { value: "3h", ar: "3 ساعات", en: "3 hours" },
  { value: "custom", ar: "مخصص", en: "Custom" },
];

const sounds: Array<{ value: SoundMode; ar: string; en: string }> = [
  { value: "simple", ar: "صوت إشعار بسيط", en: "Simple notification sound" },
  { value: "takbeer", ar: "تكبيرات الشيخ علي أحمد ملا", en: "Sheikh Ali Ahmed Mullah takbeer" },
  { value: "adhan", ar: "الأذان", en: "Adhan" },
];

function IntervalRows({ value, onChange, isArabic }: { value: IntervalPreset; onChange: (value: IntervalPreset) => void; isArabic: boolean }) {
  return (
    <>
      {intervals.map((option) => (
        <FormRadioRow
          key={option.value}
          label={isArabic ? option.ar : option.en}
          onPress={() => onChange(option.value)}
          selected={value === option.value}
          trailing={<FormRow.Arrow />}
          style={{ marginHorizontal: 12 }}
        />
      ))}
    </>
  );
}

function ActionRow({ label, onPress, subLabel }: { label: string; onPress: () => void; subLabel?: string }) {
  return <FormRow label={label} subLabel={subLabel} onPress={onPress} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />;
}

function LocationModal({ visible, isArabic, onClose }: { visible: boolean; isArabic: boolean; onClose: () => void }) {
  const localized = t();
  const [query, setQuery] = React.useState(vstorage.locationQuery || "");
  const [selected, setSelected] = React.useState<LocationOption | undefined>(LOCATION_OPTIONS.find((item) => item.id === vstorage.selectedLocationId));
  const results = searchLocations(query);

  React.useEffect(() => {
    if (visible) {
      setQuery(vstorage.locationQuery || "");
      setSelected(LOCATION_OPTIONS.find((item) => item.id === vstorage.selectedLocationId));
    }
  }, [visible]);

  return (
    <RN.Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <RN.View style={{ flex: 1, paddingTop: 40, backgroundColor: "#101827" }}>
        <FormRow label={localized.chooseLocation} onPress={onClose} trailing={<FormRow.Arrow />} />
        <RN.TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={localized.locationPlaceholder}
          placeholderTextColor="#94a3b8"
          style={{ margin: 12, padding: 14, borderRadius: 10, backgroundColor: "#1e293b", color: "#f8fafc" }}
        />
        <RN.ScrollView style={{ flex: 1 }}>
          {results.map((option) => (
            <FormRadioRow
              key={option.id}
              label={isArabic ? option.label : option.query}
              subLabel={isArabic ? option.query : option.label}
              selected={selected?.id === option.id}
              onPress={() => setSelected(option)}
              trailing={<FormRow.Arrow />}
              style={{ marginHorizontal: 12 }}
            />
          ))}
        </RN.ScrollView>
        <ActionRow
          label={localized.saveLocation}
          subLabel={selected ? selected.label : localized.locationRequired}
          onPress={() => {
            if (!selected) return;
            onClose();
            void saveLocation(selected.query, selected.id);
          }}
        />
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
  const [, setNow] = React.useState(Date.now());
  const prayerNames: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <LocationModal visible={locationModalVisible} isArabic={isArabic} onClose={() => setLocationModalVisible(false)} />
      <FormText>{localized.aboutText}</FormText>
      <FormText>{localized.author}</FormText>

      <FormRow label={localized.language} />
      <FormRadioRow label="العربية" selected={vstorage.language === "ar"} onPress={() => (vstorage.language = "ar")} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />
      <FormRadioRow label="English" selected={vstorage.language === "en"} onPress={() => (vstorage.language = "en")} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />

      <FormRow label={localized.location} subLabel={vstorage.location?.label || localized.defaultLocation} />
      <ActionRow label={localized.chooseLocation} subLabel={vstorage.location?.label || localized.defaultLocation} onPress={() => setLocationModalVisible(true)} />

      <FormRow label={localized.prayerTimes} subLabel={getNextPrayerText()} />
      {data ? prayerNames.map((name) => (
        <FormRow key={name} label={formatPrayerName(name, language())} subLabel={data.times[name] || "—"} style={{ marginHorizontal: 12 }} />
      )) : <FormText>{localized.noTimes}</FormText>}

      <FormRow label={localized.reminderSettings} />
      <FormSwitchRow label={localized.enabled} value={vstorage.enabled} onValueChange={(value: boolean) => (vstorage.enabled = value)} />
      <FormSwitchRow label={localized.prayerAlertsEnabled} value={vstorage.prayerAlertsEnabled} onValueChange={(value: boolean) => (vstorage.prayerAlertsEnabled = value)} />
      <FormText>{localized.stopAllReminders}: {vstorage.enabled ? "ON" : "OFF"}</FormText>

      <FormRow label={localized.duaaReminder} subLabel={`${localized.countdownDuaa}: ${getDuaaCountdown()}`} />
      <IntervalRows value={vstorage.duaaInterval} onChange={(value) => { vstorage.duaaInterval = value; rescheduleReminders(); }} isArabic={isArabic} />
      {vstorage.duaaInterval === "custom" && (
        <FormInput title={localized.customMinutes} keyboardType="numeric" value={String(vstorage.duaaCustomMinutes)} onChange={(value: string) => { vstorage.duaaCustomMinutes = Math.max(5, Number(value) || 5); rescheduleReminders(); }} style={{ marginHorizontal: 12 }} />
      )}

      <FormRow label={localized.salawatReminder} subLabel={`${localized.countdownSalawat}: ${getSalawatCountdown()}`} />
      <FormText>{localized.salawatDelay}</FormText>
      <IntervalRows value={vstorage.salawatInterval} onChange={(value) => { vstorage.salawatInterval = value; rescheduleReminders(); }} isArabic={isArabic} />
      {vstorage.salawatInterval === "custom" && (
        <FormInput title={localized.customMinutes} keyboardType="numeric" value={String(vstorage.salawatCustomMinutes)} onChange={(value: string) => { vstorage.salawatCustomMinutes = Math.max(5, Number(value) || 5); rescheduleReminders(); }} style={{ marginHorizontal: 12 }} />
      )}

      <FormRow label={localized.notificationSound} />
      {sounds.map((sound) => (
        <FormRadioRow key={sound.value} label={isArabic ? sound.ar : sound.en} selected={vstorage.reminderSound === sound.value} onPress={() => (vstorage.reminderSound = sound.value)} trailing={<FormRow.Arrow />} style={{ marginHorizontal: 12 }} />
      ))}

      {vstorage.reminderSound === "adhan" && (
        <>
          <FormRow label={localized.adhanVoice} />
          {AUDIO_VOICES.map((voice) => (
            <FormRadioRow
              key={voice.id}
              label={isArabic ? voice.nameAr : voice.name}
              subLabel={`${getAudioState(voice.id) === "downloaded" ? localized.downloaded : localized.notDownloaded} · ${voice.attribution}`}
              selected={vstorage.adhanVoice === voice.id}
              onPress={() => (vstorage.adhanVoice = voice.id as AdhanVoiceId)}
              trailing={<FormRow.Arrow />}
              style={{ marginHorizontal: 12 }}
            />
          ))}
        </>
      )}

      <FormRow label={localized.audioSection} subLabel={`${isArabic ? TAKBEER_VOICE.nameAr : TAKBEER_VOICE.name} · ${getAudioState(TAKBEER_VOICE.id) === "downloaded" ? localized.downloaded : localized.notDownloaded}`} />
      <ActionRow label={localized.downloadVoice} onPress={() => void downloadSelectedAudio()} />
      <ActionRow label={localized.downloadAll} onPress={() => void downloadAllAudio()} />
      <ActionRow label={localized.clearDownloads} onPress={clearDownloadedAudio} />

      <FormRow label={localized.testSection} />
      <ActionRow label={localized.testAdhan} onPress={testAdhan} />
      <ActionRow label={localized.testTakbeer} onPress={testTakbeer} />
      <ActionRow label={localized.testDuaa} onPress={() => void testDuaa()} />
      <ActionRow label={localized.testSalawat} onPress={() => void testSalawat()} />
      <FormText>{localized.stopAllReminders}: {vstorage.enabled ? localized.enabled : localized.stopped}</FormText>
    </RN.ScrollView>
  );
}
