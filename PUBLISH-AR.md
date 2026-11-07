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
│   ├── promo.js/css    إعلانات تريب تايمنجز المتقاطعة
│   └── ads*.js/css     مساحات AdSense
└── games/
    ├── dominoes/       دومينو: عربي (شراكة) · سحب · بلوك · خمسات
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
