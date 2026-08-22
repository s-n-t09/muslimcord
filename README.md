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
| الموقع | كتابة مدينة أو دولة أو إحداثيات ثم فتح رابط OpenStreetMap للنسخ واللصق والضغط على حفظ | غير محدد |
| أوقات الصلاة | تحديث يومي عبر خدمة AlAdhan وفق طريقة الحساب الافتراضية Muslim World League؛ الشروق تنبيه صامت فقط | مفعلة بعد حفظ الموقع |
| تذكير الدعاء | 30 دقيقة، ساعة، ساعتان، ثلاث ساعات، أو مدة مخصصة، مع مؤقت مرئي | 30 دقيقة |
| تذكير الصلاة على النبي محمد ﷺ | الفواصل نفسها، مع تأخير ثلاث دقائق بعد تذكير الدعاء | ساعة |
| الصوت | صوت إشعار بسيط للتذكيرات، أو أذان لأوقات الصلاة فقط | صوت إشعار بسيط |
| تنزيل الأصوات | تنزيل صوت محدد أو جميع الأصوات يدوياً وتخزينها محلياً عند دعم العميل | غير منزّل |
| اللغة | العربية أو English | تُستنتج من لغة العميل |

يعمل Plugin في الخلفية أثناء تفعيله باستخدام مؤقتات متباعدة بدلاً من حلقة تعمل كل ثانية؛ يستيقظ عند موعد التذكير أو بداية الدقيقة أو موعد تحديث أوقات الصلاة، مما يقلل العمل المستمر على Discord. وتُحدّث عدّادات صفحة الإعدادات كل خمس ثوانٍ فقط أثناء فتحها. زر **تفعيل التذكيرات** هو المفتاح الموحّد لإيقاف نوافذ الدعاء والصلاة على النبي وتنبيهات الصلاة معاً. تُحفظ الإعدادات في مساحة التخزين الخاصة بالعميل، ويستمر التذكير وفق اختياراتك بعد إعادة فتح Discord.

تتيح صفحة الإعدادات كتابة الموقع في حقل نصي ثم الضغط على **حفظ الموقع وتحديث الأوقات**. يوجد رابط OpenStreetMap موثوق يمكن فتحه للبحث عن المنطقة ونسخ اسم المكان أو العنوان ولصقه في الحقل. كما تتضمن أزراراً لاختبار الأذان، الدعاء، والصلاة على النبي محمد ﷺ. يعرض التنزيل حالة البدء والنسبة والحجم المنقول وحالة النجاح أو الفشل، ويمكن تنزيل صوت الأذان المحدد أو جميع الأصوات يدوياً.

تتضمن قائمة الأذان الحالية أصواتاً مكتملة فقط؛ لكل صوت نسخة مستقلة للأذان العادي ونسخة مستقلة لأذان الفجر. الأصوات المتاحة هي الشيخ علي أحمد ملا، الشيخ مشاري راشد العفاسي، وتسجيل الدوحة العام. إذا لم تتوفر النسختان لصوت ما فلا يظهر في القائمة، ويُرحّل الاختيار القديم تلقائياً إلى أول صوت مكتمل.

## Quran FM

يحتوي Plugin على قسم **Quran FM** لتشغيل إذاعة القرآن الكريم مباشرة من القاهرة أو السعودية أو USA/Tarateel. هذه بثوث مباشرة تحتاج إلى اتصال بالإنترنت ولا تُنزّل ضمن الأصوات المحلية. روابط البث مستخرجة من صفحات الإذاعات التي زوّدنا بها المستخدم: [Cairo Quran Radio](https://surahquran.com/Radio-Quran-Cairo.html)، [Saudi Quran Radio](https://surahquran.com/Radio-Quran-Saudi.html)، و[USA Quran Radio](https://surahquran.com/Radio-Quran-USA.html).

## مصادر البيانات والصوت

تُستخدم خدمة [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api) لحساب أوقات الصلاة، وتُستخدم خدمة [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/) لتحويل الموقع النصي إلى إحداثيات. تتضمن قائمة الأصوات المكتملة الشيخ علي أحمد ملا من [MakkahAzan](https://archive.org/details/MakkahAzan) و[مقطع فجر علي ملا](https://archive.org/details/MakkahFajrAdhan6913SheikhAliMullah)، والشيخ مشاري راشد العفاسي من [Assabile](https://www.assabile.com/adhan-call-prayer)، وتسجيل الدوحة العام من [Internet Archive](https://archive.org/details/adhan.recordings.from.doha.qatar). لكل صوت ملف عادي وملف فجر مستقل، ويستخدم Plugin ملف الفجر وقت صلاة الفجر والملف العادي في بقية الصلوات. وللتوافق مع Kettu وVendetta، يُستدعى constructor بمفتاح Discord الداخلي `vibing_wumpus` وقناة الإخراج `default`؛ استخدام كلمة `media` مباشرةً لا يحدد مسار Discord الداخلي بشكل صحيح. يوجد fallback للويب والرابط الأصلي إذا لم يقبل العميل النسخة المخزنة. يعرض التنزيل تقدماً حقيقياً من stream الاستجابة عندما يرسل الخادم حجم الملف.

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
| Location | Enter a city, country, copied place name, address, or coordinates, with help from the OpenStreetMap search link | Not set |
| Prayer times | Refreshes daily prayer times through AlAdhan using the default Muslim World League method; Sunrise is notification-only | Enabled after saving a location |
| Du'a reminders | 30 minutes, 1 hour, 2 hours, 3 hours, or a custom interval, with a visible countdown | 30 minutes |
| Salawat reminders | The same interval choices, delayed by three minutes after a du'a reminder | 1 hour |
| Sound | Simple notification sound for reminders, or full adhan for prayer times only | Simple notification sound |
| Audio downloads | Download the selected adhan voice or all voices manually for local reuse | Not downloaded |
| Language | Arabic or English | Client locale |

When enabled, the plugin uses scheduled timeouts instead of a one-second background loop: it wakes at reminder deadlines, minute boundaries, and the daily refresh deadline. The settings screen refreshes visible countdowns every five seconds only while it is open. A single **Enable reminders** switch controls all reminder pop-ups. Settings are stored in the client plugin storage and remain available after restarting Discord. The settings screen includes test buttons for adhan, du'a, and blessings upon Prophet Muhammad ﷺ. Audio downloads display preparation, percentage, transferred size, success, and failure states.

## Data and audio sources

Prayer times use the [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api); Quran FM provides direct live stations for [Cairo](https://surahquran.com/Radio-Quran-Cairo.html), [Saudi Arabia](https://surahquran.com/Radio-Quran-Saudi.html), and [USA/Tarateel](https://surahquran.com/Radio-Quran-USA.html). Each listed adhan voice has both a regular and a Fajr file; voices without both files are excluded rather than showing a broken option. Fajr uses the Fajr variant, while other prayers use the regular variant.  Fajr, Dhuhr, Asr, Maghrib, and Isha can use the selected adhan, while Sunrise always uses a simple notification only. The location field accepts a copied place name, address, or coordinates. A trusted [OpenStreetMap search page](https://www.openstreetmap.org/search) is linked from Settings to help users find and copy the correct location, and the submitted place is resolved with [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/). Available complete adhan pairs include Sheikh Ali Ahmed Mullah from [MakkahAzan](https://archive.org/details/MakkahAzan) and [Makkah Fajr Adhan](https://archive.org/details/MakkahFajrAdhan6913SheikhAliMullah), Sheikh Mishary Rashid Alafasy from [Assabile](https://www.assabile.com/adhan-call-prayer), and a public-domain Doha pair from [Internet Archive](https://archive.org/details/adhan.recordings.from.doha.qatar). On Android, playback uses the client’s native `MobileAudioSound` interface first. For Kettu and Vendetta compatibility, the constructor receives Discord’s internal `vibing_wumpus` sound key and the `default` output channel; passing `media` directly does not select Discord’s internal sound route correctly. The plugin then falls back to web audio or the original URL. Downloads begin only after the user presses a button and show live progress when the response exposes a readable stream and size.

## Compatibility and development

The project follows the official Vendetta plugin layout: each plugin has a `manifest.json` and a main source file, and the build emits `index.js` and `manifest.json` under `dist/MuslimCord/`, then the workflow copies both files to the GitHub Pages root so the root installation URL works directly. Settings include a saved text location field with an OpenStreetMap helper link, one unified reminder switch, visible countdowns, independent test actions, manual audio downloads with progress, and selectable adhan voices. `@vendetta/*` modules remain external and are resolved by the client at runtime.

To build locally, install Node.js and pnpm, then run:

```bash
pnpm install
pnpm typecheck
pnpm build
```

Every push to `main` triggers GitHub Actions, builds the plugin, and publishes `dist/` to GitHub Pages. The installation URL is the site root itself: a browser receives the bilingual landing page, while the client fetches `manifest.json` and then `index.js` from that same root URL.

### Troubleshooting activation

On Stable releases such as 311.20, use the root URL exactly as written, preferably with the trailing slash: `https://s-n-t09.github.io/muslimcord/`. Seeing the HTML landing page in a browser is expected; the client fetches `manifest.json` and then `index.js` from that same URL in the background. Do not use the old `/MuslimCord/` path as the installation URL.
