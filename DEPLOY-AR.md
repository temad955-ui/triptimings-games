# نشر منصة الألعاب وتشغيل الإعلانات (خطوة بخطوة)

## الطريقة الأسرع والمجانية: GitHub Pages (بدون سيرفر)

الريبو فيه نشر تلقائي جاهز (`.github/workflows/pages.yml`). محتاج منك مرة واحدة بس:

1. **Settings ← General ←** آخر الصفحة **Danger Zone ← Change visibility ← Public** (GitHub Pages مجاني للريبو العام بس).
2. **Settings ← Pages ← Build and deployment ← Source**: اختار **GitHub Actions**.
3. **Actions ← Deploy to GitHub Pages ← Run workflow**.
4. بعد دقيقتين الموقع يشتغل على: `https://temad955-ui.github.io/triptimings-games/`

**دومين خاص (اختياري):** في لوحة الدومين أضف سجل `CNAME` اسمه `games` وقيمته `temad955-ui.github.io`، وبعدين **Settings ← Pages ← Custom domain** اكتب `games.yourdomain.com` وفعّل **Enforce HTTPS**.

> لما تشتري سيرفر بعدين، نفس الكود يتنشر على Coolify بالخطوات اللي تحت من غير أي تعديل.

---

## أولًا: الدومين (DNS) لسيرفر Coolify

1. ادخل لوحة الدومين (Hostinger أو Cloudflare أو غيره).
2. أضف سجل جديد:

| النوع | الاسم (Host) | القيمة | TTL |
|---|---|---|---|
| `A` | `games` | عنوان IP بتاع سيرفر الـ VPS اللي عليه Coolify | تلقائي |

3. لو بتستخدم Cloudflare: خلّي السحابة **رمادي (DNS only)** لحد ما Coolify يطلع شهادة SSL، وبعدها تقدر تشغلها برتقالي.
4. استنى من 5 دقايق لساعة، واتأكد بالأمر: `nslookup games.yourdomain.com` لازم يرجع IP السيرفر.

## ثانيًا: النشر على Coolify

1. **Projects ← New ← Resource ← Private Repository (GitHub App)** واختار `triptimings-games`، الفرع `main`.
2. **Build Pack**: `Dockerfile`.
3. **Base Directory**: `/` و **Dockerfile Location**: `/Dockerfile`.
4. **Ports Exposes**: `8080`.
5. **Domains**: `https://games.yourdomain.com` (لازم تكتب https عشان Coolify يعمل الشهادة).
6. **Health Check**: Path ‏`/healthz` و Port ‏`8080`.
7. اضغط **Deploy**. بعد ما يخلص افتح الدومين، وجرّب `https://games.yourdomain.com/healthz` لازم يكتب `ok`.
8. فعّل **Auto Deploy** عشان أي تعديل على `main` ينزل لوحده.

> بديل Docker Compose: نفس الخطوات لكن Build Pack = `Docker Compose`، وامسح سطر `ports` من `docker-compose.yml` واكتب الدومين على خدمة `games`.

## ثالثًا: مساحات الإعلانات (موجودة دلوقتي في كل الصفحات)

| المكان | اللوبي | الألعاب الخمسة |
|---|---|---|
| بنر علوي `banner-top` | ✓ تحت الهيدر | — |
| بنر سفلي `banner-bottom` | ✓ قبل الفوتر | ✓ مثبت تحت الشاشة، **يختفي أثناء اللعب** |
| شاشة البداية `start` | — | ✓ (في CyberBreaker تحت القائمة الرئيسية) |
| شاشة النهاية `gameover` | — | ✓ تحت زرار "العب مرة أخرى" |

- المقاسات: البنر 320×50 على الموبايل و728×90 على الكمبيوتر. شاشة البداية والنهاية 320×100 على الموبايل و300×250 على الشاشات الكبيرة. الارتفاع محجوز مسبقًا، فالصفحة مش بتتحرك لما الإعلان يحمّل.
- **افتراضيًا** كل مساحة بتعرض عرض من عروض تريب تايمنجز (من `site/shared/promo.js`).
- أثناء اللعب مفيش أي إعلان فوق اللعبة، والإعلانات بعيدة عن أزرار اللعب.

## رابعًا: تشغيل Google AdSense (بدون أي تعديل في الألعاب)

1. انشر الموقع الأول على الدومين، وتأكد إن صفحة `/privacy.html` شغالة (املأ البيانات اللي بين `[ ]` فيها).
2. سجّل في <https://adsense.google.com> وضيف الموقع `games.yourdomain.com` واستنى الموافقة (ممكن تاخد من أيام لأسابيع).
3. بعد الموافقة: **Ads ← By ad unit ← Display ads**، اعمل وحدة لكل مساحة (أو وحدة واحدة للكل) وانسخ رقم `data-ad-slot`.
4. افتح `site/shared/ads-config.js` وعدّل:

```js
provider: 'adsense',
adsense: {
  client: 'ca-pub-1234567890123456',   // رقم الناشر بتاعك
  slots: {
    'banner-top':    '1111111111',
    'banner-bottom': '2222222222',
    'start':         '3333333333',
    'gameover':      '4444444444',
  },
},
```

5. افتح `site/ads.txt` وامسح علامة `#` من سطر Google وحط رقم الناشر بتاعك.
6. اعمل Commit و Push، و Coolify هينشر لوحده.

**لو الإعلان المدفوع ما ظهرش** (حجب إعلانات، مفيش إعلان متاح، نت ضعيف) المساحة بترجع تعرض عرض تريب تايمنجز تلقائيًا بعد 5 ثواني بحد أقصى.

## خامسًا: الموافقة على الخصوصية (إلزامي لأوروبا)

جوجل بتشترط رسالة موافقة معتمدة لزوار أوروبا وبريطانيا وسويسرا:

1. في AdSense: **Privacy & messaging ← European regulations ← Create message**، واختار الموقع، واربطه بصفحة `/privacy.html`، واضغط **Publish**.
2. خلّي `consent: 'google-cmp'` في `ads-config.js` (القيمة الحالية). الرسالة بتظهر لوحدها مع سكربت AdSense.
3. لو عندك نظام موافقة خاص: حط `consent: 'manual'` ونادِ `TTAds.grantConsent()` بعد ما الزائر يوافق.

## سادسًا: أي شبكة إعلانات تانية

في `ads-config.js` حط `provider: 'custom'` والصق كود الشبكة لكل مساحة:

```js
custom: {
  slots: {
    'banner-bottom': '<script async src="https://network.example/tag.js" data-zone="123"></script>',
  },
},
```

السكربتات جوه الكود بتشتغل تلقائيًا. الشبكات اللي بتستخدم `document.write` مش هتشتغل، اطلب منهم كود "async".

## تطبيق الأندرويد

ما اتغيرش. AdSense ممنوع جوه التطبيقات، فالمنصة بتقفل الشبكات الخارجية تلقائيًا لو اتفتحت جوه تطبيق Capacitor. التطبيق بيكمل يستخدم AdMob من `cyberbreaker-android/web-extra/ads-config.js` ومن الـ Secrets في GitHub زي ما هو.

## ملاحظات مهمة

- **ما تضغطش على إعلاناتك أبدًا.** جوجل بتقفل الحساب.
- إعدادات الأمان (CSP) في `nginx.conf` بقت تسمح بسكربتات الإعلانات الخارجية عبر HTTPS. لو مش هتستخدم إعلانات مدفوعة، فيه سطر أكثر أمانًا مكتوب كتعليق في نفس الملف.
- لو عدّلت لعبة CyberBreaker في مجلد `cyberbreaker/` في ريبو CyberBreaker-Studio، شغّل `./scripts/sync-cyberbreaker.sh ../CyberBreaker-Studio/cyberbreaker` عشان تتنسخ للمنصة ومعاها مساحات الإعلانات.
