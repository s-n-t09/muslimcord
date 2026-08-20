import { ReactNative as RN, React } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";
import { getNextPrayerText, language, refreshPrayerData, t, useDeviceLocation, vstorage, type IntervalPreset } from ".";
import { formatPrayerName, type PrayerName } from "./prayer";
import type { SoundMode } from "./sound";

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
  { value: "takbeer", ar: "التكبير", en: "Takbeer" },
  { value: "adhan", ar: "الأذان كاملاً", en: "Full adhan" },
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

export default function Settings() {
  useProxy(vstorage);
  const isArabic = language() === "ar";
  const localized = t();
  const data = vstorage.prayerData;
  const prayerNames: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <FormText>{localized.aboutText}</FormText>
      <FormText>{localized.author}</FormText>

      <FormRow label={localized.language} />
      <FormRadioRow
        label="العربية"
        selected={vstorage.language === "ar"}
        onPress={() => (vstorage.language = "ar")}
        trailing={<FormRow.Arrow />}
        style={{ marginHorizontal: 12 }}
      />
      <FormRadioRow
        label="English"
        selected={vstorage.language === "en"}
        onPress={() => (vstorage.language = "en")}
        trailing={<FormRow.Arrow />}
        style={{ marginHorizontal: 12 }}
      />

      <FormRow label={localized.location} subLabel={localized.locationHint} />
      <FormInput
        title=""
        placeholder={localized.locationPlaceholder}
        value={vstorage.locationQuery}
        onChange={(value: string) => (vstorage.locationQuery = value)}
        style={{ marginHorizontal: 12 }}
      />
      <FormRow
        label={localized.refreshLocation}
        onPress={() => void refreshPrayerData()}
        trailing={<FormRow.Arrow />}
        style={{ marginHorizontal: 12 }}
      />
      <FormRow
        label={localized.autoLocation}
        onPress={() => void useDeviceLocation()}
        trailing={<FormRow.Arrow />}
        style={{ marginHorizontal: 12 }}
      />
      <FormText>{vstorage.location?.label || localized.defaultLocation}</FormText>

      <FormRow label={localized.prayerTimes} subLabel={getNextPrayerText()} />
      {data ? (
        prayerNames.map((name) => (
          <FormRow
            key={name}
            label={formatPrayerName(name, language())}
            subLabel={data.times[name] || "—"}
            style={{ marginHorizontal: 12 }}
          />
        ))
      ) : <FormText>{localized.noTimes}</FormText>}

      <FormRow label={localized.reminderSettings} />
      <FormSwitchRow
        label={localized.enabled}
        value={vstorage.enabled}
        onValueChange={(value: boolean) => (vstorage.enabled = value)}
      />
      <FormSwitchRow
        label={localized.prayerReminder}
        value={vstorage.prayerAlertsEnabled}
        onValueChange={(value: boolean) => (vstorage.prayerAlertsEnabled = value)}
      />
      <FormSwitchRow
        label={localized.duaaReminder}
        value={vstorage.duaaEnabled}
        onValueChange={(value: boolean) => (vstorage.duaaEnabled = value)}
      />
      <FormRow label={localized.duaaInterval} />
      <IntervalRows value={vstorage.duaaInterval} onChange={(value) => (vstorage.duaaInterval = value)} isArabic={isArabic} />
      {vstorage.duaaInterval === "custom" && (
        <FormInput
          title={localized.customMinutes}
          keyboardType="numeric"
          value={String(vstorage.duaaCustomMinutes)}
          onChange={(value: string) => (vstorage.duaaCustomMinutes = Math.max(5, Number(value) || 5))}
          style={{ marginHorizontal: 12 }}
        />
      )}
      <FormSwitchRow
        label={localized.salawatReminder}
        value={vstorage.salawatEnabled}
        onValueChange={(value: boolean) => (vstorage.salawatEnabled = value)}
      />
      <FormRow label={localized.salawatInterval} subLabel={isArabic ? "يبدأ بعد 3 دقائق من الدعاء" : "Starts 3 minutes after a du'a reminder"} />
      <IntervalRows value={vstorage.salawatInterval} onChange={(value) => (vstorage.salawatInterval = value)} isArabic={isArabic} />
      {vstorage.salawatInterval === "custom" && (
        <FormInput
          title={localized.customMinutes}
          keyboardType="numeric"
          value={String(vstorage.salawatCustomMinutes)}
          onChange={(value: string) => (vstorage.salawatCustomMinutes = Math.max(5, Number(value) || 5))}
          style={{ marginHorizontal: 12 }}
        />
      )}

      <FormRow label={localized.notificationSound} />
      {sounds.map((sound) => (
        <FormRadioRow
          key={sound.value}
          label={isArabic ? sound.ar : sound.en}
          selected={vstorage.reminderSound === sound.value}
          onPress={() => (vstorage.reminderSound = sound.value)}
          trailing={<FormRow.Arrow />}
          style={{ marginHorizontal: 12 }}
        />
      ))}
      <FormText>{isArabic ? "التذكير بالصلاة على النبي يتأخر 3 دقائق بعد الدعاء." : "The salawat reminder is delayed by 3 minutes after a du'a reminder."}</FormText>
    </RN.ScrollView>
  );
}
