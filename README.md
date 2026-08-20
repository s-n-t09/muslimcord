# MuslimCord

**MuslimCord** هو Plugin خفيف ثنائي اللغة لتطبيقات Discord Modding المتوافقة مع Vendetta، مثل **Revenge** و**Kettu**. يعرض أوقات الصلاة حسب موقع المستخدم، وينشئ تذكيرات هادئة بالدعاء والصلاة على النبي ﷺ، مع إمكانية اختيار نمط الصوت واللغة والفواصل الزمنية.

> **Author:** S.N.T  
> **ID:** `1444349574859980881`

## رابط التثبيت

```text
https://s-n-t09.github.io/muslimcord/
```

## طريقة التثبيت بالعربية

1. انسخ الرابط: `https://s-n-t09.github.io/muslimcord/`.
2. افتح Discord ثم اذهب إلى **Settings** ثم **Plugins**.
3. اضغط على علامة **+** لبدء إضافة Plugin.
4. الصق الرابط واضغط **Install**.
5. إذا ظهر طلب تأكيد، اضغط **Confirm**.
6. اضبط إعداداتك المفضلة من زر **🔧** الذي بجانب اسم MuslimCord.

## المزايا والإعدادات

| الإعداد | التفاصيل | القيمة الافتراضية |
| --- | --- | --- |
| الموقع | إدخال مدينة ودولة أو إحداثيات، مع خيار استخدام موقع الجهاز عند توفره | غير محدد |
| أوقات الصلاة | تحديث يومي عبر خدمة AlAdhan وفق طريقة الحساب الافتراضية Muslim World League | مفعلة بعد تحديد الموقع |
| تذكير الدعاء | 30 دقيقة، ساعة، ساعتان، ثلاث ساعات، أو مدة مخصصة | 30 دقيقة |
| تذكير الصلاة على النبي ﷺ | الفواصل نفسها، مع تأخير ثلاث دقائق بعد تذكير الدعاء | ساعة |
| الصوت | صوت إشعار بسيط، التكبير، أو الأذان كاملاً | صوت إشعار بسيط |
| اللغة | العربية أو English | تُستنتج من لغة العميل |

يعمل Plugin في الخلفية أثناء تفعيله، ويتحقق من أوقات الصلاة مرة كل دقيقة. تُحفظ الإعدادات في مساحة التخزين الخاصة بالعميل، ويستمر التذكير وفق اختياراتك بعد إعادة فتح Discord.

## مصادر البيانات والصوت

تُستخدم خدمة [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api) لحساب أوقات الصلاة، وتُستخدم خدمة [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/) لتحويل اسم المكان إلى إحداثيات. في نمط الأذان الكامل يستخدم Plugin ملفات أذان عامة من [Internet Archive](https://archive.org/details/adhan.recordings.from.doha.qatar)، بينما يستخدم نمط التكبير نطقاً عربياً عند توفر Web Speech API مع fallback صوتي قصير. يحتاج جلب الأوقات والأذان الكامل إلى اتصال بالإنترنت.

## التوافق والتطوير

المشروع مبني على صيغة Vendetta الرسمية: يحتوي كل Plugin على `manifest.json` وملف JavaScript رئيسي، ويُخرج البناء ملف `index.js` و`manifest.json` داخل `dist/MuslimCord/`، ثم ينسخهما Workflow إلى جذر GitHub Pages حتى يعمل رابط التثبيت الجذري مباشرة. تُحمّل وحدات `@vendetta/*` من كائن العميل وقت التشغيل، لذلك لا تُضمَّن حزم Discord الداخلية في الملف النهائي.

للبناء محلياً، ثبّت Node.js وpnpm ثم نفّذ:

```bash
pnpm install
pnpm typecheck
pnpm build
```

بعد كل push إلى فرع `main`، يبني GitHub Actions Plugin وينشر `dist/` إلى GitHub Pages. رابط التثبيت هو جذر الموقع نفسه؛ وعند فتحه في المتصفح تظهر صفحة الشرح، بينما يقرأ العميل `manifest.json` ثم `index.js` تلقائياً من نفس الجذر.

### استكشاف مشكلة عدم التفعيل

في إصدارات Stable مثل 311.20 يجب استخدام الرابط الجذري التالي حرفياً، ويفضل إبقاء الشرطة المائلة الأخيرة: `https://s-n-t09.github.io/muslimcord/`. عند فتحه في المتصفح ستظهر صفحة HTML، وهذا طبيعي؛ إذ يطلب العميل خلف الكواليس `manifest.json` ثم ملف `index.js` من الرابط نفسه. لا تستخدم المسار القديم `/MuslimCord/` كرابط تثبيت.

---

# MuslimCord — English

**MuslimCord** is a lightweight bilingual plugin for Vendetta-compatible Discord modding clients, including **Revenge** and **Kettu**. It shows prayer times for the selected location and provides gentle du'a and salawat reminders with configurable intervals, sounds, and language.

> **Author:** S.N.T  
> **ID:** `1444349574859980881`

## Installation URL

```text
https://s-n-t09.github.io/muslimcord/
```

## Installation steps

1. Copy the installation link: `https://s-n-t09.github.io/muslimcord/`.
2. Open Discord and go to **Settings**, then **Plugins**.
3. Press the **+** button to add a plugin.
4. Paste the URL and press **Install**.
5. If a confirmation appears, press **Confirm**.
6. Open the **🔧** button next to MuslimCord to configure your preferences.

## Features and settings

| Setting | Details | Default |
| --- | --- | --- |
| Location | Enter a city and country or coordinates, with an optional device-location action | Not set |
| Prayer times | Refreshes daily prayer times through AlAdhan using the default Muslim World League method | Enabled after location selection |
| Du'a reminders | 30 minutes, 1 hour, 2 hours, 3 hours, or a custom interval | 30 minutes |
| Salawat reminders | The same interval choices, delayed by three minutes after a du'a reminder | 1 hour |
| Sound | Simple notification sound, takbeer, or full adhan | Simple notification sound |
| Language | Arabic or English | Client locale |

When enabled, the plugin checks the clock once per minute while Discord is running. Settings are stored in the client plugin storage and remain available after restarting Discord.

## Data and audio sources

Prayer times use the [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api), and place names are resolved with [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/). Full-adhan mode uses public-domain recordings from [Internet Archive](https://archive.org/details/adhan.recordings.from.doha.qatar). Takbeer mode uses Arabic speech synthesis when available and a short audible fallback otherwise. Prayer-time retrieval and full adhan playback require an internet connection.

## Compatibility and development

The project follows the official Vendetta plugin layout: each plugin has a `manifest.json` and a main source file, and the build emits `index.js` and `manifest.json` under `dist/MuslimCord/`, and the workflow copies both files to the GitHub Pages root so the root installation URL works directly. `@vendetta/*` modules remain external and are resolved by the client at runtime.

To build locally, install Node.js and pnpm, then run:

```bash
pnpm install
pnpm typecheck
pnpm build
```

Every push to `main` triggers GitHub Actions, builds the plugin, and publishes `dist/` to GitHub Pages. The installation URL is the site root itself: a browser receives the bilingual landing page, while the client fetches `manifest.json` and then `index.js` from that same root URL.

### Troubleshooting activation

On Stable releases such as 311.20, use the root URL exactly as written, preferably with the trailing slash: `https://s-n-t09.github.io/muslimcord/`. Seeing the HTML landing page in a browser is expected; the client fetches `manifest.json` and then `index.js` from that same URL in the background. Do not use the old `/MuslimCord/` path as the installation URL.
