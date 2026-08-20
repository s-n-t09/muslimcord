export type SoundMode = "simple" | "takbeer" | "adhan";

const ADHAN_URLS = [
  "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3",
  "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3",
  "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_03_Asr_Adhan.mp3",
  "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_04_Maghrib_Adhan.mp3",
  "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_05_Isha_Adhan.mp3",
];

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
    // Some Android Discord runtimes expose no Web Audio API.
  }
}

function playTakbeer(): void {
  try {
    const speech = (globalThis as any).speechSynthesis;
    const Utterance = (globalThis as any).SpeechSynthesisUtterance;
    if (speech && Utterance) {
      const utterance = new Utterance("الله أكبر");
      utterance.lang = "ar-SA";
      utterance.rate = 0.78;
      utterance.volume = 0.8;
      speech.cancel();
      speech.speak(utterance);
      return;
    }
  } catch {
    // Fall through to a short audible fallback.
  }
  playTone(660, 230);
  setTimeout(() => playTone(880, 320), 250);
}

function playAdhan(): void {
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (AudioCtor) {
      const player = new AudioCtor(ADHAN_URLS[0]);
      player.volume = 0.75;
      const promise = player.play?.();
      if (promise?.catch) promise.catch(() => playTone(740, 340));
      return;
    }
  } catch {
    // Fall through to a short audible fallback.
  }
  playTone(740, 340);
}

export function playReminderSound(mode: SoundMode, prayerIndex = 0): void {
  if (mode === "simple") {
    playTone(880, 170);
    return;
  }
  if (mode === "takbeer") {
    playTakbeer();
    return;
  }
  try {
    const AudioCtor = (globalThis as any).Audio;
    if (AudioCtor) {
      const player = new AudioCtor(ADHAN_URLS[Math.max(0, Math.min(prayerIndex, ADHAN_URLS.length - 1))]);
      player.volume = 0.75;
      const promise = player.play?.();
      if (promise?.catch) promise.catch(() => playAdhan());
      return;
    }
  } catch {
    // Use the generic fallback below.
  }
  playAdhan();
}
