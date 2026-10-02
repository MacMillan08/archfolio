(function () {
  // Fotoğraflar ekrana girince zoom-out efektini başlat
  var media = document.querySelectorAll(".zoom-media");

  // Giriş animasyonu bitince hover zoom'un devreye girmesi için .settled ekle
  media.forEach(function (el) {
    var img = el.querySelector("img");
    if (!img) return;
    var settle = function () { el.classList.add("settled"); };
    img.addEventListener("transitionend", function (event) {
      if (event.propertyName === "transform" && el.classList.contains("in-view")) settle();
    });
    // transitionend gelmezse (ör. azaltılmış hareket) yedek olarak
    new MutationObserver(function (_, observer) {
      if (el.classList.contains("in-view")) {
        setTimeout(settle, 2700);
        observer.disconnect();
      }
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    media.forEach(function (el) { observer.observe(el); });
  } else {
    media.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Kategori filtresi (backend'e istek atmadan, doğrudan DOM üzerinde)
  var buttons = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".project-card");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.getAttribute("data-filter");
      buttons.forEach(function (b) { b.classList.toggle("is-active", b === button); });
      cards.forEach(function (card) {
        card.hidden = filter !== "all" && card.getAttribute("data-category") !== filter;
      });
    });
  });

  // Mobilde sol menüyü aç/kapat
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");
  var navScrim = document.getElementById("navScrim");

  if (navToggle && siteNav) {
    var closeNav = function () {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    if (navScrim) navScrim.addEventListener("click", closeNav);
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });
  }

  // Hero amblemindeki "CAN DURMUŞ" harf animasyonu — gerçek rastgele sırayla,
  // bulanıklıktan netliğe (blur reveal). TEK AYAR NOKTASI: HERO_TEXT_TIMING.
  //
  // Logo/yarım-ay animasyonu (style.css'te saf CSS @keyframes, 17s döngü) buna
  // göre önceden hesaplanmış sabit yüzdelerle senkronize edildi: sol/sağ, t=2.0s'de
  // açılıyor (HERO_TEXT_TIMING.startOffset) ve t=9.0s'de kapanmaya başlıyor
  // (startOffset + settleWindow + holdAfterSettle + exitWindow = 2000+2000+3000+2000).
  // Bu üç değerden herhangi birini değiştirirsen, style.css'teki emblemDarken/
  // emblemLogo/emblemHalvesFade/emblemHalfLeft/emblemHalfRight yüzdelerini VE
  // HERO_CYCLE_MS'i (= style.css'teki animation-duration: 17s) elle yeniden
  // hesaplaman gerekir — otomatik türetilmiyor.
  var heroLetters = document.querySelectorAll(".emblem-text .letter");
  if (heroLetters.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var HERO_TEXT_TIMING = {
      letterDuration: 500, // tek harfin bulanıklıktan netliğe geçme süresi (ms) — 400-600 önerilir
      settleWindow: 2000, // TÜM harflerin yerleşmesi için toplam süre (ms) — ~1.5-2.5s aralığında sabit
      holdAfterSettle: 3000, // son harf netleştikten sonra bekleme (ms)
      exitWindow: 2000, // TÜM harflerin kaybolması için toplam süre (ms), girişle aynı
      startOffset: 2000, // döngü başından (logo açılana kadar) ilk harfin belirmeye başlamasına kadar geçen süre (ms)
    };
    var HERO_CYCLE_MS = 17000; // style.css'teki .emblem-frame animation-duration ile aynı olmalı

    var letters = Array.prototype.slice.call(heroLetters);

    // Harflere ait rastgele başlangıç gecikmeleri: toplam pencereyi eşit dilimlere
    // böler, her dilime küçük bir harf atar, sonra hangi harfin hangi dilimi
    // alacağını karıştırır. Toplam süre HER ZAMAN aynı kalır (0'dan pencere
    // sonuna kadar), sadece harflerin SIRASI her döngüde yeniden karışır.
    var shuffledOffsets = function (totalWindow, singleDuration, count) {
      var maxDelay = Math.max(0, totalWindow - singleDuration);
      var offsets = [];
      for (var i = 0; i < count; i++) {
        offsets.push(count > 1 ? (maxDelay * i) / (count - 1) : 0);
      }
      for (var j = offsets.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = offsets[j];
        offsets[j] = offsets[k];
        offsets[k] = tmp;
      }
      return offsets;
    };

    var playHeroLetters = function (direction) {
      var totalWindow = direction === "in" ? HERO_TEXT_TIMING.settleWindow : HERO_TEXT_TIMING.exitWindow;
      var animName = direction === "in" ? "heroLetterIn" : "heroLetterOut";
      var offsets = shuffledOffsets(totalWindow, HERO_TEXT_TIMING.letterDuration, letters.length);
      letters.forEach(function (letter, index) {
        letter.style.animationName = animName;
        letter.style.animationDuration = HERO_TEXT_TIMING.letterDuration + "ms";
        letter.style.animationTimingFunction = "ease";
        letter.style.animationDelay = offsets[index] + "ms";
        letter.style.animationIterationCount = "1";
        // "both": gecikme sırasında animasyonun başlangıç durumunu (görünmez/bulanık)
        // hemen uygular (flaş olmaz), bittikten sonra da son durumda kalır.
        letter.style.animationFillMode = "both";
      });
    };

    // ÖNEMLİ — sekme arka plana alındığında/geri geldiğinde asla kalıcı olarak
    // kaymaması için: setInterval(fn, 17000) GÖRELİ çalışır (her çağrı, bir
    // öncekinin fiilen ne zaman ateşlendiğine göre sonraki 17sn'yi hedefler).
    // Tarayıcılar arka plandaki sekmelerin zamanlayıcılarını kısıtlar/geciktirir;
    // bu gecikme setInterval ile KALICI olarak birikir ve logo (CSS, gerçek
    // saate bağlı, hiç kaymaz) ile harfler (eski haliyle JS'e bağlı) arasında
    // kalıcı bir faz farkı oluşurdu — arada bir "yazı kapalı logonun içinde
    // kalıyor" hatasının kök nedeni tam olarak buydu.
    //
    // Çözüm: her adımda MUTLAK saate (Date.now()) göre "şu an hangi 17sn'lik
    // döngünün neresindeyiz" diye yeniden hesapla ve bir sonraki olaya kalan
    // süreyi buna göre planla. Bir setTimeout geç ateşlense bile, bir sonraki
    // hesaplama gerçek zamana göre kendini otomatik düzeltir — sapma birikmez.
    var heroCycleStart = Date.now(); // CSS animasyonlarıyla aynı an: sayfa yüklenirken

    var scheduleNextHeroPhase = function () {
      var now = Date.now();
      var elapsed = now - heroCycleStart;
      var cycleStart = heroCycleStart + Math.floor(elapsed / HERO_CYCLE_MS) * HERO_CYCLE_MS;
      var tIn = cycleStart + HERO_TEXT_TIMING.startOffset;
      var tOut = tIn + HERO_TEXT_TIMING.settleWindow + HERO_TEXT_TIMING.holdAfterSettle;
      var tNextCycle = cycleStart + HERO_CYCLE_MS;

      if (now < tIn) {
        window.setTimeout(function () {
          playHeroLetters("in");
          scheduleNextHeroPhase();
        }, tIn - now);
      } else if (now < tOut) {
        window.setTimeout(function () {
          playHeroLetters("out");
          scheduleNextHeroPhase();
        }, tOut - now);
      } else {
        window.setTimeout(scheduleNextHeroPhase, tNextCycle - now);
      }
    };

    // Sayfa boyanmadan önce harfleri hemen görünmez/bulanık yap — aksi halde
    // logo daha açılmadan (ilk 2sn) düz metin görünür ve kapalı logoyla çakışır.
    letters.forEach(function (letter) {
      letter.style.opacity = "0";
      letter.style.filter = "blur(" + getComputedStyle(document.documentElement).getPropertyValue("--hero-letter-blur").trim() + ")";
    });

    scheduleNextHeroPhase();
  }

  // Splash ekranı (yalnızca #splash-screen varsa, yani ana sayfada).
  // Sıra: logo.png durur → sol/sağ'a bölünüp kayar → aralarında "CAN DURMUŞ" belirir → açılır.
  // Her aşama tek bir sınıf ekler, CSS o sınıfa karşılık gelen transition'ı tetikler.
  var splash = document.getElementById("splash-screen");
  if (splash) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var timers = [];
    var schedule = function (fn, delay) { timers.push(window.setTimeout(fn, delay)); };
    var clearAllTimers = function () {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
    };
    var hideSplash = function () {
      if (splash.classList.contains("is-hidden")) return;
      clearAllTimers();
      splash.classList.add("is-hidden");
      document.documentElement.classList.remove("has-splash");
      window.setTimeout(function () { splash.hidden = true; }, 600);
    };

    if (reduceMotion) {
      hideSplash();
    } else {
      document.documentElement.classList.add("has-splash");

      // Süreler (ms), her adım bir öncekinin bitişinden başlar. Fade (p-swap) ile
      // hareket (p-open) kesinlikle ayrı aşamalar — biri tam bitmeden diğeri başlamaz,
      // aksi halde iki görsel bir an üst üste biniyor (önceki hatanın kök nedeni).
      var HOLD_LOGO = 700; // logo.png bir an tek başına durur
      var SWAP = 450; // logo.png kaybolur, sol/sağ (henüz birleşik) belirir — SADECE fade
      var OPEN = 550; // artık tam opak olan sol/sağ ayrılır — SADECE hareket
      var TEXT_IN = 450; // yarım logolar tamamen ayrıldıktan sonra "CAN DURMUŞ" belirir
      var HOLD_FINAL = 800; // okunması için bir an beklenir

      var tOpen = HOLD_LOGO + SWAP;
      var tText = tOpen + OPEN;
      var end = tText + TEXT_IN + HOLD_FINAL;

      schedule(function () { splash.classList.add("p-swap"); }, HOLD_LOGO);
      schedule(function () { splash.classList.add("p-open"); }, tOpen);
      schedule(function () { splash.classList.add("p-text"); }, tText);
      schedule(hideSplash, end);

      var skipBtn = document.getElementById("splashSkip");
      if (skipBtn) skipBtn.addEventListener("click", hideSplash);
      splash.addEventListener("click", function (event) {
        if (event.target === splash) hideSplash();
      });
    }
  }
})();
