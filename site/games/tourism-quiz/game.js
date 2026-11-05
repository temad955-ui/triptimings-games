/* Egypt Explorer Quiz — Trip Timings Games Hub */
'use strict';
(() => {
  const hub = window.TTHub;
  const BANK = window.TT_QUIZ || [];
  const STR = {
    ar: { title: 'مستكشف مصر', score: 'النقاط', best: 'الأفضل', intro: '10 أسئلة · 20 ثانية لكل سؤال · كلما أسرعت زادت نقاطك',
      catEgypt: 'سياحة مصر', catMixed: 'منوعات', catGeneral: 'معلومات عامة', play: 'ابدأ المسابقة', fifty: '50:50',
      next: 'السؤال التالي', finish: 'النتيجة', again: 'العب مرة أخرى', share: 'شارك النتيجة',
      correct: 'إجابة صحيحة! ✅', wrong: 'إجابة خاطئة ❌', timeout: 'انتهى الوقت ⏰', visit: 'زُرها مع تريب تايمنجز ←',
      r3: 'خبير سياحة حقيقي!', r2: 'مستكشف ممتاز!', r1: 'بداية جيدة!', r0: 'جرّب مرة أخرى!',
      line: '{c} من {t} إجابات صحيحة', newBest: ' · رقم قياسي جديد 🏆',
      shareText: 'حصلت على {s} نقطة في مسابقة مستكشف مصر! جرّبها:', copied: 'تم نسخ الرابط', streak: '🔥 ×{n}' },
    en: { title: 'Egypt Explorer', score: 'Score', best: 'Best', intro: '10 questions · 20 seconds each · answer faster to score more',
      catEgypt: 'Egypt travel', catMixed: 'Mixed', catGeneral: 'General', play: 'Start quiz', fifty: '50:50',
      next: 'Next question', finish: 'See result', again: 'Play again', share: 'Share score',
      correct: 'Correct! ✅', wrong: 'Wrong ❌', timeout: 'Time’s up ⏰', visit: 'Visit it with Trip Timings →',
      r3: 'True Egypt expert!', r2: 'Great explorer!', r1: 'Good start!', r0: 'Give it another go!',
      line: '{c} of {t} correct', newBest: ' · new record 🏆',
      shareText: 'I scored {s} on the Egypt Explorer quiz! Try it:', copied: 'Link copied', streak: '🔥 ×{n}' },
  };
  const T = (k, v) => { let s = (STR[hub.lang] || STR.ar)[k] || k; for (const x in v || {}) s = s.replace('{' + x + '}', v[x]); return s; };
  const tt = (d) => hub.t(d);
  const $ = (s) => document.querySelector(s);
  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T(el.dataset.t)));
  document.title = T('title') + ' · Trip Timings Games';

  const ROUND = 10, TIME = 20;
  let cat = hub.load('quiz.cat', 'egypt');
  let Q = null; // round state
  let timer = 0, tStart = 0;

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function pickQuestions() {
    let pool;
    if (cat === 'mixed') {
      const eg = shuffle(BANK.filter((q) => q.c === 'egypt')).slice(0, 6);
      const ge = shuffle(BANK.filter((q) => q.c === 'general')).slice(0, ROUND - eg.length);
      pool = shuffle(eg.concat(ge));
    } else pool = shuffle(BANK.filter((q) => q.c === cat)).slice(0, ROUND);
    // avoid repeating the last round's questions when the bank allows
    return pool;
  }

  function show(id) { ['startView', 'qView', 'resultView'].forEach((v) => ($('#' + v).hidden = v !== id)); }

  function start() {
    Q = { list: pickQuestions(), i: 0, score: 0, correct: 0, streak: 0, fifty: true };
    $('#score').textContent = '0';
    $('#fiftyBtn').disabled = false;
    show('qView');
    ask();
    hub.track('game_start', { game: 'tourism-quiz', cat });
  }

  function ask() {
    const q = Q.list[Q.i];
    Q.answered = false;
    $('#qNum').textContent = (Q.i + 1) + ' / ' + Q.list.length;
    $('#streak').textContent = Q.streak >= 2 ? T('streak', { n: Q.streak }) : '';
    $('#qText').textContent = tt(q.q);
    $('#fact').hidden = true; $('#nextBtn').hidden = true;
    $('#fiftyBtn').disabled = !Q.fifty;
    const box = $('#answers'); box.innerHTML = '';
    const order = shuffle([0, 1, 2, 3]);
    order.forEach((idx, n) => {
      const b = document.createElement('button');
      b.className = 'answer'; b.dataset.idx = idx;
      b.innerHTML = '<span class="key">' + (hub.lang === 'ar' ? 'أبجد'[n] : 'ABCD'[n]) + '</span><span></span>';
      b.lastChild.textContent = tt(q.a[idx]);
      b.addEventListener('click', () => answer(idx));
      box.appendChild(b);
    });
    tStart = performance.now();
    cancelAnimationFrame(timer);
    tick();
  }

  function tick() {
    const left = Math.max(0, TIME - (performance.now() - tStart) / 1000);
    const fill = $('#timerFill');
    fill.style.transform = 'scaleX(' + (left / TIME) + ')';
    fill.classList.toggle('low', left < 5);
    if (left <= 0) return answer(-1);
    timer = requestAnimationFrame(tick);
  }

  function answer(idx) {
    if (Q.answered) return;
    Q.answered = true;
    cancelAnimationFrame(timer);
    const q = Q.list[Q.i];
    const left = Math.max(0, TIME - (performance.now() - tStart) / 1000);
    const ok = idx === 0;
    document.querySelectorAll('.answer').forEach((b) => {
      b.disabled = true;
      if (b.dataset.idx === '0') b.classList.add('correct');
      else if (Number(b.dataset.idx) === idx) b.classList.add('wrong');
    });
    if (ok) {
      Q.correct++; Q.streak++;
      Q.score += 100 + Math.round(left * 5) + (Q.streak >= 3 ? 50 : 0);
      buzz(15);
    } else { Q.streak = 0; buzz([40, 30, 40]); }
    $('#score').textContent = Q.score;

    const fact = $('#fact');
    fact.innerHTML = '';
    const head = document.createElement('b');
    head.textContent = ok ? T('correct') : idx === -1 ? T('timeout') : T('wrong');
    const p = document.createElement('span'); p.textContent = tt(q.f);
    fact.append(head, p);
    if (q.o && window.TTPromo) {
      const a = document.createElement('a');
      a.href = TTPromo.url('/', { content: 'quiz-fact-' + q.o });
      a.target = '_blank'; a.rel = 'noopener';
      a.dataset.surface = 'quiz-fact'; a.dataset.offer = q.o;
      a.textContent = T('visit');
      fact.append(a);
    }
    fact.hidden = false;
    $('#nextBtn').textContent = Q.i + 1 < Q.list.length ? T('next') : T('finish');
    $('#nextBtn').hidden = false;
    $('#nextBtn').focus({ preventScroll: true });
  }

  function next() {
    Q.i++;
    if (Q.i < Q.list.length) ask(); else finish();
  }

  function finish() {
    const ratio = Q.correct / Q.list.length;
    const tier = ratio >= .9 ? 3 : ratio >= .6 ? 2 : ratio >= .3 ? 1 : 0;
    const record = hub.setBest('tourism-quiz', Q.score);
    $('#best').textContent = hub.getBest('tourism-quiz');
    $('#resultIcon').textContent = ['🧭', '🐪', '🏺', '🏆'][tier];
    $('#resultTitle').textContent = T('r' + tier);
    $('#resultScore').textContent = Q.score;
    $('#resultLine').textContent = T('line', { c: Q.correct, t: Q.list.length }) + (record && Q.score > 0 ? T('newBest') : '');
    show('resultView');
    window.TTPromo && TTPromo.banner($('#resultPromo'), { surface: 'quiz-result' });
    window.TTPromo && TTPromo.gameOver({ score: Q.score });
  }

  function fifty() {
    if (!Q || !Q.fifty || Q.answered) return;
    Q.fifty = false; $('#fiftyBtn').disabled = true;
    shuffle([1, 2, 3]).slice(0, 2).forEach((idx) => {
      const b = document.querySelector('.answer[data-idx="' + idx + '"]');
      if (b) { b.classList.add('gone'); b.disabled = true; }
    });
  }

  async function share() {
    const text = T('shareText', { s: Q ? Q.score : 0 });
    const url = location.origin + location.pathname;
    hub.track('share', { game: 'tourism-quiz' });
    try {
      if (navigator.share) { await navigator.share({ title: T('title'), text, url }); return; }
      await navigator.clipboard.writeText(text + ' ' + url);
      $('#shareBtn').textContent = T('copied');
      setTimeout(() => ($('#shareBtn').textContent = T('share')), 1500);
    } catch (e) { /* user cancelled */ }
  }

  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } }

  function setCat(c) {
    cat = c; hub.store('quiz.cat', c);
    document.querySelectorAll('.cat').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cat === c)));
  }
  document.querySelectorAll('.cat').forEach((b) => b.addEventListener('click', () => setCat(b.dataset.cat)));
  $('#startBtn').addEventListener('click', start);
  $('#againBtn').addEventListener('click', () => show('startView'));
  $('#nextBtn').addEventListener('click', next);
  $('#fiftyBtn').addEventListener('click', fifty);
  $('#shareBtn').addEventListener('click', share);
  document.addEventListener('keydown', (e) => {
    if ($('#qView').hidden || !Q) return;
    const n = '1234'.indexOf(e.key);
    if (n >= 0 && !Q.answered) { const b = document.querySelectorAll('.answer')[n]; b && !b.disabled && b.click(); }
    if (e.key === 'Enter' && Q.answered && document.activeElement !== $('#nextBtn')) next();
  });
  document.addEventListener('visibilitychange', () => {
    // pause the clock while the tab is hidden
    if (!Q || Q.answered || $('#qView').hidden) return;
    if (document.hidden) { Q.hiddenAt = performance.now(); cancelAnimationFrame(timer); }
    else if (Q.hiddenAt) { tStart += performance.now() - Q.hiddenAt; Q.hiddenAt = 0; tick(); }
  });

  setCat(cat);
  $('#best').textContent = hub.getBest('tourism-quiz');
})();
