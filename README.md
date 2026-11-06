# MuslimCord

إضافة ثنائية اللغة لعميل Discord المعدّل **Valenced**. تعرض أوقات الصلاة حسب الموقع، وتنبه للصلاة، وتعرض تذكيرات الدعاء والصلاة على النبي محمد ﷺ. لا تحتوي على Quran FM.

## التثبيت من ملف ZIP | Installation from ZIP

لم يعد التثبيت يعتمد على رابط المستودع. يتم التثبيت من ملف ZIP الذي ينتجه GitHub Actions.

1. افتح تبويب **Actions** في مستودع MuslimCord.
2. افتح آخر تشغيل ناجح باسم **Build MuslimCord ZIP**.
3. من قسم **Artifacts** نزّل `MuslimCord-Valenced-ZIP`.
4. فك ضغط ملف الـArtifact الذي تم تنزيله. سيظهر بداخله ملف الإضافة المطلوب:
   `com.snt.muslimcord@2.0.0.zip`.
5. افتح Discord ثم ادخل إلى **Settings** ثم **Plugins**.
6. اضغط علامة الترس الموجودة في أعلى يمين صفحة Plugins.
7. اختر **Install from file**.
8. اختر ملف `com.snt.muslimcord@2.0.0.zip` الذي ظهر بعد فك ضغط الـArtifact.
9. بعد التثبيت فعّل MuslimCord وافتح إعداداته لضبط اللغة والموقع والتنبيهات.

The plugin is no longer installed from a repository URL. Install it from the ZIP produced by GitHub Actions:

1. Open the **Actions** tab in the MuslimCord repository.
2. Open the latest successful **Build MuslimCord ZIP** run.
3. Download `MuslimCord-Valenced-ZIP` from **Artifacts**.
4. Extract the downloaded Artifact ZIP. It contains the actual plugin file:
   `com.snt.muslimcord@2.0.0.zip`.
5. Open Discord, go to **Settings**, then **Plugins**.
6. Tap the gear icon in the top-right corner of the Plugins page.
7. Choose **Install from file**.
8. Select `com.snt.muslimcord@2.0.0.zip` from the extracted Artifact.
9. Enable MuslimCord and open its settings to configure language, location, and alerts.

آخر تشغيل ناجح وملف ZIP:

- [GitHub Actions build](https://github.com/s-n-t09/muslimcord/actions/runs/42219878969)
- [Download Artifact](https://api.github.com/repos/s-n-t09/muslimcord/actions/artifacts/13502493944/zip)

## المزايا | Features

- العربية والإنجليزية.
- اختيار الموقع وتحديث أوقات الصلاة من AlAdhan بعد تحديد المكان عبر OpenStreetMap.
- تذكيرات خفيفة قابلة للإيقاف للدعاء والصلاة على النبي محمد ﷺ.
- صوت إشعار بسيط أو أذان عادي مع نسخة مستقلة لأذان الفجر.
- تنزيل محلي للأصوات وتشغيل Native عبر Valenced bridge، من دون `data:` URI.
- تشغيل آمن للشروق كتذكير فقط من دون أذان.

## البناء للمطورين | Development

يتطلب القالب الرسمي JDK 25 وAndroid SDK 36 وBun/Node. يتم البناء تلقائياً عبر Workflow اسمه **Build MuslimCord ZIP**، ويُرفع ملف ZIP كـArtifact بعد نجاح البناء.

للبناء محلياً:

```sh
pnpm install
pnpm build
pnpm generate-index -- --dist build/dist --base-url https://s-n-t09.github.io/muslimcord
```

ينتج البناء `build/dist/com.snt.muslimcord@2.0.0.zip`، وهو الملف الذي يجب اختياره من خلال **Install from file**. ملف Artifact الذي تنزله من Actions هو غلاف ZIP يحتوي ملف الإضافة هذا.

**Author:** S.N.T — `1444349574859980881`
