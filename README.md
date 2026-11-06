# MuslimCord

إضافة ثنائية اللغة لعميل Discord المعدّل **Valenced**. تعرض أوقات الصلاة حسب الموقع، وتنبه للصلاة، وتعرض تذكيرات الدعاء والصلاة على النبي محمد ﷺ. لا تحتوي على Quran FM.

## التثبيت | Installation

أضف رابط مستودع الإضافات في Valenced:

`https://s-n-t09.github.io/muslimcord/`

ثم اختر **MuslimCord** وثبته. يقرأ Valenced `index.json` وحزمة ZIP الرسمية الناتجة من قالب Valenced.

Add the repository URL in Valenced:

`https://s-n-t09.github.io/muslimcord/`

Then choose **MuslimCord** and install it. Valenced reads the generated `index.json` and the official plugin ZIP.

## المزايا | Features

- العربية والإنجليزية.
- اختيار الموقع وتحديث أوقات الصلاة من AlAdhan بعد تحديد المكان عبر OpenStreetMap.
- تذكيرات خفيفة قابلة للإيقاف للدعاء والصلاة على النبي محمد ﷺ.
- صوت إشعار بسيط أو أذان عادي مع نسخة مستقلة لأذان الفجر.
- تنزيل محلي للأصوات وتشغيل Native عبر Valenced bridge، من دون `data:` URI.
- تشغيل آمن للشروق كتذكير فقط من دون أذان.

## البناء للمطورين | Development

يتطلب القالب الرسمي JDK 25 وAndroid SDK 36 وBun/Node. انشر API المحلي لـValenced ثم نفّذ:

```sh
pnpm install
pnpm build
pnpm generate-index -- --dist build/dist --base-url https://s-n-t09.github.io/muslimcord
```

ينتج البناء `build/dist/com.snt.muslimcord@2.0.0.zip`، ويكون `index.json` هو فهرس مستودع Valenced.

**Author:** S.N.T — `1444349574859980881`
