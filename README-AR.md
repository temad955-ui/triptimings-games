# منصة ألعاب تريب تايمنجز (Trip Timings Games Hub)

موقع ألعاب HTML5 خفيف: لوبي رئيسي + 5 ألعاب + نظام إعلانات متقاطعة لموقع تريب تايمنجز، يشتغل على Nginx داخل Docker وجاهز للنشر على Coolify.

## الهيكل

```
triptimings-games/
├── Dockerfile              ← صورة nginx-unprivileged (بورت 8080، بدون root)
├── nginx.conf              ← ضغط gzip، كاش، Security headers، /healthz
├── docker-compose.yml      ← للتشغيل المحلي أو Coolify
├── scripts/sync-cyberbreaker.sh  ← ينسخ أحدث نسخة من CyberBreaker للمنصة
└── site/
    ├── index.html  lobby.css  lobby.js   ← صفحة اللوبي
    ├── 404.html
    ├── shared/
    │   ├── hub.js      ← اللغة (عربي/إنجليزي)، أفضل النتائج، التتبع
    │   ├── hub.css     ← التصميم المشترك للألعاب
    │   ├── promo.js    ← مكوّن الإعلانات المتقاطعة (العروض + روابط UTM)
    │   ├── promo.css   ← تصميم الإعلانات (مستقل، يشتغل في أي لعبة)
    │   ├── ads-config.js ← ⚙️ إعدادات AdSense أو أي شبكة مدفوعة (الملف الوحيد اللي بتعدله)
    │   ├── ads.js      ← مساحات الإعلانات: عرض تريب تايمنجز افتراضيًا، والإعلان المدفوع لو متاح
    │   └── ads.css     ← مقاسات المساحات (320×50 / 728×90 / 320×100 / 300×250)
    ├── ads.txt         ← سطر الناشر بتاع AdSense
    ├── privacy.html    ← سياسة الخصوصية (مسودة، املأ البيانات)
    └── games/
        ├── bubble-shooter/   فقاعات النيل
        ├── tourism-quiz/     مستكشف مصر (40 سؤال في questions.js)
        ├── snake/            الثعبان النيون (كلاسيك · بوابات · متاهة)
        ├── spin-wheel/       عجلة الحظ اليومية
        └── cyberbreaker/     CyberBreaker (نسخة من مجلد cyberbreaker/ في الريبو)
```

## التشغيل محليًا

```bash
cd triptimings-games
docker compose up -d --build
# افتح http://localhost:8080
```

## النشر على Coolify

> الدليل الكامل (DNS + Coolify + تشغيل AdSense + الموافقة): [DEPLOY-AR.md](DEPLOY-AR.md)

1. **New Resource** ← اختار الريبو `triptimings-games` والفرع `main`.
2. **Build Pack**: `Dockerfile`.
3. **Base Directory**: `/` و **Dockerfile Location**: `/Dockerfile`.
4. **Ports Exposes**: `8080`.
5. **Health Check Path**: `/healthz`.
6. حط الدومين (مثلاً `games.triptimings.com`) واضغط **Deploy**. Coolify بيعمل شهادة SSL لوحده.

## قبل الإطلاق (مهم)

| البند | فين | ليه |
|---|---|---|
| رابط موقع تريب تايمنجز | `site/shared/promo.js` ← `siteUrl` | حاليًا `https://triptimings.com` كقيمة مؤقتة |
| روابط العروض | نفس الملف ← `offers[].path` | كل عرض بيفتح الصفحة الرئيسية حاليًا، حط رابط صفحة الرحلة |
| أكواد الخصم `TTGAME5` و `TTGAME10` | `site/games/spin-wheel/game.js` | لازم تتعمل في نظام الحجز بحد استخدام وتاريخ انتهاء، أو خلي `w: 0` لإيقافها |
| Google Analytics / Tag Manager | `nginx.conf` ← `$csp` | الـ CSP بيمنع أي سكربت خارجي، ضيف دومين التحليلات لو هتستخدمه |

> عجلة الحظ بتختار الجائزة داخل المتصفح، فأي زائر يقدر يمسح بيانات الموقع ويلف تاني. ده مقبول للنقاط والنصائح، لكن الخصومات لازم تتأكد وتتحدد في نظام الحجز (استخدام واحد لكل عميل).

## الإعلانات المتقاطعة (promo.js)

- **شريط سفلي** بيظهر بعد 20 ثانية لعب ويتقفل للجلسة (مقفول في العجلة و CyberBreaker عشان الأزرار تحت).
- **كارت عرض بعد انتهاء الجولة**: كل جولتين، ومش أكتر من مرة كل 90 ثانية.
- **بانر** في اللوبي وشاشات النتيجة وعجلة الحظ.
- **رابط في كل سؤال سياحي** في المسابقة بيودي للرحلة المرتبطة.
- كل الروابط عليها `utm_source=games-hub&utm_medium=game&utm_campaign=<اسم اللعبة>&utm_content=<المكان-العرض>` عشان تعرف كل حجز جه منين في Google Analytics.
- لو في `window.dataLayer` أو `gtag` بيتبعت أحداث: `tt_game_start`، `tt_game_over`، `tt_promo_view`، `tt_promo_click`، `tt_wheel_prize`.

إضافة لعبة جديدة للإعلانات = سطرين قبل سكربت اللعبة:

```html
<script src="../../shared/hub.js"></script>
<script src="../../shared/promo.js" data-game="اسم-اللعبة" data-home="1"></script>
```

وبعد نهاية الجولة: `TTPromo.gameOver({ score })`.
لعبة جاهزة مش عايز تعدّل كودها؟ استخدم `data-watch="#id-شاشة-الخسارة"` زي CyberBreaker.

## تحديث CyberBreaker

المصدر الأساسي للعبة هو مجلد `cyberbreaker/` في ريبو `CyberBreaker-Studio` (هو اللي بيتبني منه تطبيق الأندرويد).
بعد أي تعديل عليه شغّل:

```bash
./scripts/sync-cyberbreaker.sh ../CyberBreaker-Studio/cyberbreaker
```
