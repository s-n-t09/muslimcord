import { readFile } from "node:fs/promises";

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
    findByProps: () => ({}),
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
if ("testAdhan" in raw || "testFajrAdhan" in raw || js.includes("Test regular adhan") || js.includes("Test Fajr adhan")) {
  throw new Error("Adhan test actions are still exposed");
}

plugin.onLoad();

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
class MockXMLHttpRequest {
  status = 200;
  response = undefined;
  responseType = "";
  aborted = false;
  timer = undefined;
  open() {}
  send() {
    let loaded = 0;
    this.timer = setInterval(() => {
      if (this.aborted) return;
      loaded += 25;
      this.onprogress?.({ loaded, total: 100 });
      if (loaded >= 100) {
        clearInterval(this.timer);
        this.response = new Blob([new Uint8Array(100)], { type: "audio/mpeg" });
        this.onload?.();
      }
    }, 100);
  }
  abort() {
    if (this.aborted) return;
    this.aborted = true;
    if (this.timer) clearInterval(this.timer);
    this.onabort?.();
  }
}
global.XMLHttpRequest = MockXMLHttpRequest;
await raw.downloadSelectedAudio();
unsubscribeProgress();
if (writes.length !== 2 || writes.some(({ storageDir, encoding, data }) => storageDir !== "documents" || encoding !== "base64" || data.startsWith("data:"))) {
  throw new Error(`Native local-file download contract failed: ${JSON.stringify(writes)}`);
}
if (!Object.values(vendetta.plugin.storage.audioCache).every((value) => value.startsWith("file://"))) {
  throw new Error(`Download did not store file URIs: ${JSON.stringify(vendetta.plugin.storage.audioCache)}`);
}
if (progressSnapshots.filter(({ active, percent }) => active && percent > 0 && percent < 100).length < 2 || !progressSnapshots.some(({ active }) => active === false)) {
  throw new Error(`Download progress session did not update in real time: ${JSON.stringify(progressSnapshots)}`);
}

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

console.log(JSON.stringify({ removedRadioExports: "absent", adhanTestActions: "absent", nativeFileWrites: writes.length, progressSnapshots: progressSnapshots.length, cancellation: "passed" }));
