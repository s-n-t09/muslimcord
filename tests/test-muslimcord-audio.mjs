import { readFile } from "node:fs/promises";

let nativePlayCount = 0;
const nativeUrls = [];
const nativeKeys = [];
const nativeChannels = [];

class MockMobileAudioSound {
  constructor(url, soundKey, volume, outputChannel) {
    nativeUrls.push(url);
    nativeKeys.push(soundKey);
    nativeChannels.push(outputChannel);
  }

  async play() {
    nativePlayCount += 1;
  }
}

global.window = {
  React: { createElement: (...args) => ({ args }), Fragment: "Fragment" },
  ReactNative: { ScrollView: "ScrollView" },
};

const vendetta = {
  logger: { log() {}, error() {} },
  plugin: { storage: { enabled: true, reminderSound: "adhan", adhanVoice: "ali-ahmed-mullah" } },
  ui: {
    alerts: { showConfirmationAlert() {} },
    toasts: { showToast() {} },
    components: { Forms: {} },
  },
  metro: {
    findByProps: () => ({ MobileAudioSound: MockMobileAudioSound }),
    common: { React: window.React, ReactNative: window.ReactNative },
  },
  storage: {},
};

const js = await readFile(new URL("../dist/MuslimCord/index.js", import.meta.url), "utf8");
const evaluate = eval(`vendetta => { return ${js} }`);
const raw = evaluate(vendetta);
const plugin = raw?.default ?? raw;

const removedRadioExport = String.fromCharCode(81, 85, 82, 65, 78) + "_FM_STATIONS";
const removedPlayExport = String.fromCharCode(112, 108, 97, 121, 81, 117, 114, 97, 110, 70, 109);
const removedStopExport = String.fromCharCode(115, 116, 111, 112, 81, 117, 114, 97, 110, 70, 109);
if (removedRadioExport in raw || removedPlayExport in raw || removedStopExport in raw) {
  throw new Error("Removed radio exports are still present");
}
const removedSourceTerms = [
  String.fromCharCode(113, 117, 114, 97, 110, 70, 109),
  "radio" + ".jar",
  String.fromCharCode(113, 117, 114, 97, 110, 103, 111),
  "DCD" + "SoundManager",
];
if (removedSourceTerms.some((term) => js.includes(term))) {
  throw new Error("Removed live-radio implementation remains in the bundle");
}

plugin.onLoad();

raw.testAdhan();
if (nativePlayCount !== 0) throw new Error("A missing local adhan unexpectedly invoked native playback");

vendetta.plugin.storage.audioCache = {
  "ali-ahmed-mullah:normal": "data:audio/mpeg;base64,SUQz",
};
raw.testAdhan();
if (nativePlayCount !== 0) throw new Error("A data URI unexpectedly reached MobileAudioSound");

const writes = [];
window.nativeModuleProxy = {
  NativeFileModule: {
    getConstants: () => ({ DocumentsDirPath: "/data/user/0/com.discord/files" }),
    writeFile: async (storageDir, path, data, encoding) => {
      writes.push({ storageDir, path, data, encoding });
      return `/data/user/0/com.discord/files/${path}`;
    },
  },
};
global.FileReader = class MockFileReader {
  async readAsDataURL(blob) {
    const bytes = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type};base64,${bytes.toString("base64")}`;
    this.onloadend?.();
  }
};
const progressSnapshots = [];
const unsubscribeProgress = raw.subscribeAudioDownload(() => {
  const session = raw.getAudioDownloadSession();
  if (session) progressSnapshots.push({ active: session.active, completed: session.completed, percent: session.progress?.percent, speed: session.progress?.speedBytesPerSecond });
});
global.fetch = async () => {
  const bytes = new Uint8Array([65, 66, 67]);
  let consumed = false;
  return {
    ok: true,
    headers: { get: () => String(bytes.length) },
    body: { getReader: () => ({ read: async () => consumed ? { done: true } : ((consumed = true), { done: false, value: bytes }) }) },
  };
};
await raw.downloadSelectedAudio();
unsubscribeProgress();
if (writes.length !== 2 || writes.some(({ storageDir, encoding, data }) => storageDir !== "documents" || encoding !== "base64" || data.startsWith("data:"))) {
  throw new Error(`Native local-file download contract failed: ${JSON.stringify(writes)}`);
}
if (!Object.values(vendetta.plugin.storage.audioCache).every((value) => value.startsWith("file://"))) {
  throw new Error(`Download did not store file URIs: ${JSON.stringify(vendetta.plugin.storage.audioCache)}`);
}
if (!progressSnapshots.some(({ active, percent }) => active && percent !== undefined) || !progressSnapshots.some(({ active }) => active === false)) {
  throw new Error(`Download progress session did not update correctly: ${JSON.stringify(progressSnapshots)}`);
}

vendetta.plugin.storage.audioCache = {
  "ali-ahmed-mullah:normal": "file:///data/user/0/com.discord/files/muslimcord/adhan/ali-ahmed-mullah_normal.mp4",
};
vendetta.plugin.storage.audioDownloadState = { "ali-ahmed-mullah:normal": "downloaded" };
raw.testAdhan();
await new Promise((resolve) => setTimeout(resolve, 25));

global.fetch = async () => ({
  ok: true,
  headers: { get: () => "100" },
  body: { getReader: () => ({ read: () => new Promise((resolve) => setTimeout(() => resolve({ done: false, value: new Uint8Array([1]) }), 50)) }) },
});
const cancellation = raw.downloadAllAudio();
await new Promise((resolve) => setTimeout(resolve, 10));
raw.cancelAudioDownload();
await cancellation;
if (raw.getAudioDownloadSession()?.result !== "cancelled") {
  throw new Error(`Download cancellation failed: ${JSON.stringify(raw.getAudioDownloadSession())}`);
}
plugin.onUnload();

if (nativePlayCount !== 1 || !nativeUrls[0].startsWith("file://") || nativeKeys[0] !== "vibing_wumpus" || nativeChannels[0] !== "default") {
  throw new Error(`Safe local audio contract failed: ${JSON.stringify({ nativePlayCount, nativeUrls, nativeKeys, nativeChannels })}`);
}

console.log(JSON.stringify({ removedRadioExports: "absent", missingCacheNativeCalls: 0, dataUriNativeCalls: 0, localFileNativeCalls: nativePlayCount, nativeFileWrites: writes.length, progressSnapshots: progressSnapshots.length, cancellation: "passed", localUrl: nativeUrls[0] }));
