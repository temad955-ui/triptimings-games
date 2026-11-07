# نشر المشروع على GitHub Pages · أوامر Git

الموقع كله في مجلد `site/` وبيتنشر تلقائيًا على GitHub Pages عن طريق `.github/workflows/pages.yml`
مع كل push على فرع `main`. الرابط: https://temad955-ui.github.io/triptimings-games/

## هيكل المجلدات

```
site/
├── index.html · lobby.js · lobby.css   اللوبي (عجلة الحظ اليومية + كل الألعاب + دعوة الأصدقاء)
├── shared/
│   ├── hub.js          اللغة (تلقائيًا حسب لغة الموبايل) + أفضل النتائج
│   ├── economy.js/css  المحفظة ⭐ + إعلانات المكافأة + الشراء داخل التطبيق + نظام الدعوات
│   ├── arcade.js/css   شاشات البداية والنهاية والمكافآت المشتركة لألعاب الآركيد
│   ├── levels.js       المستويات المحفوظة وشاشات الفوز/الخسارة والمساعدات لألعاب الألغاز
│   ├── road3d.js       محرك طرق 3D خفيف (بدون WebGL) لألعاب السباقات والتوك توك والجري
│   ├── promo.js/css    إعلانات تريب تايمنجز المتقاطعة
│   └── ads*.js/css     مساحات AdSense
└── games/
    ├── dominoes/       دومينو: عربي (شراكة) · سحب · بلوك · خمسات (+ رابط دومينو 31)
    ├── domino31/       دومينو 31 (نسخة من ريبو domino31 عبر scripts/sync-domino31.sh)
    ├── nile-blocks/    بلوكات النيل (ألغاز)
    ├── neon-stack/     برج النيون (آركيد)
    ├── desert-rush/    سباق الصحراء (سباقات)
    ├── pharaoh-memory/ ذاكرة الفراعنة (ذكاء)
    ├── nile-match/     كنوز النيل (ماتش 3 بخريطة مراحل)
    ├── sand-sort/      رمال سيوة (فرز الألوان)
    ├── parking-jam/    زحمة الجراج
    ├── arrow-escape/   هروب الأسهم
    ├── chess/          شطرنج الفراعنة (engine.js مختبَر بـ perft)
    ├── pool/           بلياردو النيل 8 كرات
    ├── kids-academy/   أكاديمية الصغار (حروف + حساب، بدون إعلانات)
    ├── nile-racer/     سباق النيل السريع 3D (عربية · موتوسيكل · نقل · فورمولا)
    ├── tuktuk-cairo/   توك توك القاهرة 3D
    ├── cairo-runner/   عدّاء القاهرة 3D
    ├── bubble-shooter/ فقاعات النيل
    ├── tourism-quiz/   مستكشف مصر
    ├── spin-wheel/     عجلة الحظ اليومية
    └── cyberbreaker/   سايبر بريكر
store/                  نصوص Google Play بالعربي والإنجليزي
```

## 1) أول مرة (مجلد جديد على جهازك)

```bash
git init
git add .
git commit -m "Trip Timings Games: unified Dominoes, shared wallet, referrals, ASO"
git branch -M main
git remote add origin https://github.com/temad955-ui/triptimings-games.git
git push -u origin main
```

> لو المستودع على GitHub فيه commits بالفعل، `git push` هيرفض. في الحالة دي استخدم الطريقة رقم 2.

## 2) المستودع موجود بالفعل (الطريقة الموصى بها)

```bash
git clone https://github.com/temad955-ui/triptimings-games.git
cd triptimings-games
git checkout main
git pull origin main
# … عدّل الملفات …
git add .
git commit -m "Update games"
git push origin main
```

لدمج هذا التحديث: اعمل Merge لطلب الدمج (Pull Request) على GitHub، أو من الطرفية:

```bash
git fetch origin
git checkout main
git merge origin/claude/project-thread-kgwkm0
git push origin main
```

## 3) تشغيل GitHub Pages (مرة واحدة)
1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. بعد كل push على `main` افتح تبويب **Actions** وتأكد إن «Deploy to GitHub Pages» نجح.

## تجربة محليًا

```bash
cd site && python3 -m http.server 8080   # http://localhost:8080
# أو
docker compose up -d --build             # http://localhost:8080
```

## تحديث دومينو 31 من الريبو بتاعه

دومينو 31 بيفضل في الريبو المستقل `temad955-ui/domino31` (المحرك والسيرفر والاختبارات).
المنصة بتاخد نسخة من واجهة الويب الجاهزة بس:

```bash
git clone https://github.com/temad955-ui/domino31.git ../domino31
./scripts/sync-domino31.sh ../domino31
git add site/games/domino31 && git commit -m "Sync Domino 31" && git push
```

على GitHub Pages يشتغل «اللعب ضد الكمبيوتر» فقط. اللعب أونلاين محتاج سيرفر domino31 (Docker على الـ VPS).
