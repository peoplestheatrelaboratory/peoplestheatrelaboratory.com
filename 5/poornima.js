/* POORNIMA — shared engine
   the moon · the oracle · the diya & tanpura · boiling ink · reveals */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= THE MOON =================
     Lunar age from a reference new moon (2000-01-06 18:14 UTC),
     synodic month 29.530588853 days. Poetic accuracy: ±half a day. */
  const SYNODIC = 29.530588853;
  const EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);

  function moonNow() {
    const days = (Date.now() - EPOCH) / 86400000;
    const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
    const illum = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
    const waxing = age < SYNODIC / 2;
    const toFull = waxing
      ? SYNODIC / 2 - age
      : SYNODIC - age + SYNODIC / 2;
    return { age, illum, waxing, toFull };
  }

  function phaseName(m) {
    const a = m.age;
    if (a < 1.2 || a > SYNODIC - 1.2) return ["अमावस्या", "new moon"];
    if (Math.abs(a - SYNODIC / 2) < 1.1) return ["पूर्णिमा", "full moon"];
    if (m.waxing) {
      if (a < 6.4) return ["शुक्ल पक्ष", "waxing crescent"];
      if (a < 8.4) return ["शुक्ल पक्ष", "half moon, waxing"];
      return ["शुक्ल पक्ष", "waxing gibbous"];
    }
    if (a < 21.1) return ["कृष्ण पक्ष", "waning gibbous"];
    if (a < 23.1) return ["कृष्ण पक्ष", "half moon, waning"];
    return ["कृष्ण पक्ष", "waning crescent"];
  }

  /* Every .moon-svg has a #...Shadow mask circle; slide it to shape the phase. */
  function renderMoons() {
    const m = moonNow();
    document.querySelectorAll(".moon-svg").forEach((svg) => {
      const shadow = svg.querySelector(".phase-shadow");
      if (!shadow) return;
      const cx = m.waxing ? 60 - 104 * m.illum : 60 + 104 * m.illum;
      shadow.setAttribute("cx", cx.toFixed(1));
    });
    const nights = Math.max(1, Math.round(m.toFull));
    const [paksha, en] = phaseName(m);
    const full = Math.abs(m.age - SYNODIC / 2) < 1.1;
    document.querySelectorAll(".tithi-text").forEach((el) => {
      el.innerHTML = full
        ? `${paksha} <span class="sep">·</span> ${en} <span class="sep">·</span> tonight is the night`
        : `${paksha} <span class="sep">·</span> ${en} <span class="sep">·</span> ${nights} night${nights === 1 ? "" : "s"} to Poornima`;
    });
    return m;
  }

  /* ================= THE ORACLE ================= */
  const DOHAS = [
    { d: "मोको कहाँ ढूँढे बन्दे,\nमैं तो तेरे पास में।", e: "Where do you go looking for me, friend? I am right here beside you.", p: "कबीर — Kabir" },
    { d: "पोथी पढ़ि पढ़ि जग मुआ,\nपंडित भया न कोय।\nढाई आखर प्रेम का,\nपढ़े सो पंडित होय॥", e: "Reading book upon book the whole world died, and none grew wise. Read two and a half letters of love — become the scholar.", p: "कबीर — Kabir" },
    { d: "बुरा जो देखन मैं चला,\nबुरा न मिलिया कोय।\nजो दिल खोजा आपना,\nमुझसे बुरा न कोय॥", e: "I went out to find the wicked and found no one. I searched my own heart — no one more wicked than me.", p: "कबीर — Kabir" },
    { d: "साईं इतना दीजिये,\nजा में कुटुम समाय।\nमैं भी भूखा न रहूँ,\nसाधु न भूखा जाय॥", e: "Give me only this much, Lord — enough to hold the household: that I do not go hungry, and no guest leaves hungry.", p: "कबीर — Kabir" },
    { d: "माटी कहे कुम्हार से,\nतू क्या रौंदे मोय।\nएक दिन ऐसा आएगा,\nमैं रौंदूँगी तोय॥", e: "The clay says to the potter: why do you knead me? A day will come when I will knead you.", p: "कबीर — Kabir" },
    { d: "चलती चक्की देख के,\nदिया कबीरा रोय।\nदो पाटन के बीच में,\nसाबुत बचा न कोय॥", e: "Watching the millstones turn, Kabir wept: between the two stones, nothing comes through whole.", p: "कबीर — Kabir" },
    { d: "पायो जी मैंने\nराम रतन धन पायो।", e: "I have found it — the jewel-wealth of the Name.", p: "मीरा — Meera" },
    { d: "मन चंगा तो\nकठौती में गंगा।", e: "If the heart is clear, the Ganga flows in your washbowl.", p: "रैदास — Raidas" },
    { d: "बुल्ला! की जाणा मैं कौण।", e: "Bulleh! Who knows who I am?", p: "बुल्ले शाह — Bulleh Shah" },
  ];

  function initOracle() {
    const dev = $("#dohaDev"), en = $("#dohaEn"), poet = $("#dohaPoet"),
      wrap = $("#oracle"), again = $("#drawAgain");
    if (!dev) return;

    let last = +sessionStorage.getItem("ptl5-doha") || -1;
    function pick() {
      let i;
      do { i = Math.floor(Math.random() * DOHAS.length); } while (i === last && DOHAS.length > 1);
      last = i; sessionStorage.setItem("ptl5-doha", i);
      return DOHAS[i];
    }
    function show(d) {
      dev.innerHTML = d.d.split("\n").join("<br>");
      en.textContent = d.e;
      poet.textContent = d.p;
    }
    show(pick());

    again.addEventListener("click", () => {
      if (reduced) { show(pick()); return; }
      wrap.classList.add("turning");
      setTimeout(() => { show(pick()); wrap.classList.remove("turning"); }, 520);
    });
  }

  /* ================= THE DIYA & TANPURA =================
     Clicking the diya lights the lamp (persists across pages)
     and wakes a soft synthesized tanpura: Pa–sa–sa–Sa, plucked
     slow, filtered, very quiet. Silence loses nothing. */
  let audio = null;

  function makeTanpura() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass"; warm.frequency.value = 1900; warm.Q.value = .4;
    master.connect(warm).connect(ctx.destination);

    // Sa = D. strings: Pa(A2) sa(D3) sa(D3+) SA(D2)
    const STRINGS = [110.0, 146.83, 147.6, 73.42];
    let step = 0, timer = null;

    function pluck(freq, t) {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq * 2.005;
      const bp = ctx.createBiquadFilter();
      bp.type = "lowpass"; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(freq * 7, t);
      bp.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 3.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5.2);
      const g2 = ctx.createGain(); g2.gain.value = .18;
      o.connect(bp); o2.connect(g2).connect(bp);
      bp.connect(g).connect(master);
      o.start(t); o2.start(t); o.stop(t + 5.4); o2.stop(t + 5.4);
    }
    function cycle() {
      pluck(STRINGS[step % 4], ctx.currentTime + 0.02);
      step++;
    }
    function start() {
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
      cycle();
      timer = setInterval(cycle, 1350);
    }
    function stop() {
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
      clearInterval(timer); timer = null;
    }
    return { start, stop, get playing() { return !!timer; } };
  }

  function initDiya() {
    const diya = $("#diya");
    if (!diya) return;
    const note = $("#diyaNote");
    if (localStorage.getItem("ptl5-lit")) {
      document.documentElement.classList.add("lit");
      if (note) note.textContent = "the lamp is lit — touch it for the tanpura";
    }
    diya.addEventListener("click", () => {
      const html = document.documentElement;
      if (!html.classList.contains("lit")) {
        html.classList.add("lit");
        localStorage.setItem("ptl5-lit", "1");
        if (!audio) audio = makeTanpura();
        audio.start();
        if (note) note.textContent = "the tanpura is awake — touch again for quiet";
      } else if (audio && audio.playing) {
        audio.stop();
        if (note) note.textContent = "quiet. touch the flame to bring the drone back";
      } else {
        if (!audio) audio = makeTanpura();
        audio.start();
        if (note) note.textContent = "the tanpura is awake — touch again for quiet";
      }
    });
  }

  /* ================= BOILING INK =================
     Three turbulence seeds swapped on a stepped clock, so every
     hand-drawn line wobbles like frame-by-frame ink animation. */
  function initBoil() {
    if (reduced) return;
    const html = document.documentElement;
    let f = 1;
    setInterval(() => {
      f = (f % 3) + 1;
      html.classList.remove("boil-2", "boil-3");
      if (f > 1) html.classList.add("boil-" + f);
    }, 230);
  }

  /* ================= REVEALS ================= */
  function initReveal() {
    const els = document.querySelectorAll(".draw, .rise");
    if (!("IntersectionObserver" in window) || reduced) {
      els.forEach((e) => e.classList.add("drawn"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("drawn"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16 });
    els.forEach((e) => io.observe(e));
  }

  /* ================= go ================= */
  renderMoons();
  initOracle();
  initDiya();
  initBoil();
  initReveal();
})();
