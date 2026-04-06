// ═══════════════════════════════════════════════════════════════
// ipad-patch.js — Radha Naam Jap iPad Optimizations
// Add at bottom of <body>: <script src="./ipad-patch.js"></script>
//
// FIX 1: Bell sound on iPad (iOS AudioContext must be resumed in gesture)
// FIX 2: Loading ring animation (replaces SVG textPath broken on iPad Safari)
// FIX 3: 28 Names — larger text for iPad screen
// BONUS: Larger bottom nav, larger floating naam animation
// ═══════════════════════════════════════════════════════════════

(function() {
'use strict';

// ─────────────────────────────────────────────────────────────
// FIX 1: iOS-Safe Bell Sound
// iOS Safari suspends AudioContext until a user gesture.
// We keep ONE shared context and .resume() it on every tap.
// This REPLACES the playSynthBell() defined in index.html.
// ─────────────────────────────────────────────────────────────
let _iosAudioCtx = null;

function getIOSAudioCtx() {
  if (!_iosAudioCtx) {
    try {
      _iosAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { return null; }
  }
  return _iosAudioCtx;
}

function resumeAudioCtx() {
  const ctx = getIOSAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Warm up the AudioContext on every touch — this is the iOS trick
document.addEventListener('touchstart', resumeAudioCtx, { passive: true });

// Override playSynthBell globally — this replaces the broken version
window.playSynthBell = function() {
  try {
    const ctx = getIOSAudioCtx();
    if (!ctx) return;

    function doPlayBell() {
      const notes = [[523, 0], [659, 0.3], [784, 0.6]];
      notes.forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 2.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 2.5);
      });
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlayBell).catch(() => {});
    } else {
      doPlayBell();
    }
  } catch(e) {}
};

// Override testSound to also warm up context
window.testSound = function() {
  resumeAudioCtx();
  window.playSynthBell();
};

// Patch App.ht and App.h28 to resume context on each tap
// We wrap them after the page loads to ensure App is defined
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (window.App) {
      var origHt = App.ht.bind(App);
      App.ht = function(e) {
        resumeAudioCtx();
        return origHt(e);
      };

      var origH28 = App.h28.bind(App);
      App.h28 = function(e) {
        resumeAudioCtx();
        return origH28(e);
      };
    }
  }, 500);
});

// ─────────────────────────────────────────────────────────────
// FIX 2: Loading Screen Rings — CSS orbital animation
// SVG textPath doesn't render correctly on iPad Safari.
// We replace the SVG rings with CSS-positioned <span> elements.
// ─────────────────────────────────────────────────────────────

// Inject CSS for orbital rings
var orbitalCSS = document.createElement('style');
orbitalCSS.textContent = `
  /* Hide the original SVG rings */
  .ls-ring { display: none !important; }
  .ls-ring-blue { display: none !important; }
  .ls-ring-yellow { display: none !important; }

  /* CSS orbital ring containers */
  .ipad-orbit-ring {
    position: absolute;
    border-radius: 50%;
    top: 50%;
    left: 50%;
  }
  .ipad-orbit-blue {
    width: 290px;
    height: 290px;
    margin-left: -145px;
    margin-top: -145px;
    animation: spin-rev 14s linear infinite;
  }
  .ipad-orbit-gold {
    width: 330px;
    height: 330px;
    margin-left: -165px;
    margin-top: -165px;
    animation: spin-fwd 18s linear infinite;
  }
  .ipad-orbit-char {
    position: absolute;
    font-family: 'Noto Sans Devanagari', 'Hind Siliguri', sans-serif;
    font-size: 15px;
    font-weight: 700;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .ipad-orbit-blue .ipad-orbit-char {
    color: #4A90E2;
    text-shadow: 0 0 8px rgba(74, 144, 226, 0.8);
  }
  .ipad-orbit-gold .ipad-orbit-char {
    color: #FFD700;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
  }
`;
document.head.appendChild(orbitalCSS);

function buildOrbitalRings() {
  var lsRings = document.querySelector('.ls-rings');
  if (!lsRings) {
    // Retry after DOM ready
    setTimeout(buildOrbitalRings, 200);
    return;
  }

  // Remove existing SVG ring elements
  var oldRings = lsRings.querySelectorAll('.ls-ring');
  oldRings.forEach(function(r) { r.style.display = 'none'; });

  var WORD = 'राधा';
  var REPEAT = 10;
  var chars = [];
  for (var i = 0; i < REPEAT; i++) {
    WORD.split('').forEach(function(c) { chars.push(c); });
  }
  var total = chars.length;

  function makeRing(className, radius, charClass) {
    var ring = document.createElement('div');
    ring.className = 'ipad-orbit-ring ' + className;

    chars.forEach(function(ch, i) {
      var angle = (360 / total) * i;
      var rad = (angle - 90) * Math.PI / 180;
      // Position relative to ring center (radius, radius)
      var cx = radius + Math.cos(rad) * (radius - 18);
      var cy = radius + Math.sin(rad) * (radius - 18);

      var span = document.createElement('span');
      span.className = charClass;
      span.textContent = ch;
      span.style.left = (cx - 11) + 'px';
      span.style.top  = (cy - 11) + 'px';
      span.style.transform = 'rotate(' + angle + 'deg)';
      ring.appendChild(span);
    });

    return ring;
  }

  // Gold ring (outer, forward spin)
  var goldRing = makeRing('ipad-orbit-gold', 165, 'ipad-orbit-char');
  // Blue ring (inner, reverse spin)
  var blueRing = makeRing('ipad-orbit-blue', 145, 'ipad-orbit-char');

  lsRings.appendChild(goldRing);
  lsRings.appendChild(blueRing);
}

// Build rings as early as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildOrbitalRings);
} else {
  buildOrbitalRings();
}

// ─────────────────────────────────────────────────────────────
// FIX 3: 28 Names — larger text for iPad
// Also: larger meaning text, taller tap zone
// ─────────────────────────────────────────────────────────────
var iPadNameCSS = document.createElement('style');
iPadNameCSS.textContent = `
  /* 28 Names — much larger on iPad */
  .n28name {
    font-family: 'Noto Sans Devanagari', 'Hind Siliguri', sans-serif !important;
    font-size: clamp(52px, 10vw, 90px) !important;
    line-height: 1.2 !important;
    padding: 0 16px !important;
  }

  /* Meaning text — visible and readable */
  .n28meaning {
    font-size: clamp(18px, 3vw, 26px) !important;
    opacity: 0.9 !important;
    margin-top: 10px !important;
  }

  /* 28 cycle label */
  .n28cycle {
    font-size: 14px !important;
    margin-top: 10px !important;
  }

  /* Tap zone — use more vertical space */
  .n28tz {
    min-height: 400px !important;
    border-radius: 22px !important;
  }

  /* ── BONUS: Larger bottom nav ── */
  .nb {
    padding: 10px 0 8px !important;
    font-size: 10px !important;
    gap: 5px !important;
  }
  .nb svg {
    width: 26px !important;
    height: 26px !important;
  }

  /* ── BONUS: Larger Radha title ── */
  .rn {
    font-family: 'Noto Sans Devanagari', sans-serif !important;
    font-size: clamp(36px, 6vw, 54px) !important;
  }

  /* ── BONUS: Larger mala flash text ── */
  .mf-line1 {
    font-family: 'Noto Sans Devanagari', sans-serif !important;
    font-size: clamp(38px, 7vw, 62px) !important;
  }

  /* ── BONUS: Loading title font ── */
  .ls-title {
    font-family: 'Noto Sans Devanagari', sans-serif !important;
    font-weight: 700 !important;
    font-size: 30px !important;
  }
`;
document.head.appendChild(iPadNameCSS);

// ── BONUS: Larger floating naam animation ──
// Override spawn() for larger naam on iPad
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    // Patch the global spawn function for larger floating naam
    if (typeof window.spawn === 'function') {
      var origSpawn = window.spawn;
      window.spawn = function(e, zone) {
        var r = zone.getBoundingClientRect();
        var x, y;
        if (e.touches && e.touches[0]) {
          x = e.touches[0].clientX - r.left;
          y = e.touches[0].clientY - r.top;
        } else {
          x = e.clientX - r.left;
          y = e.clientY - r.top;
        }
        var el = document.createElement('div');
        el.className = 'fn';
        el.textContent = 'राधा';
        // iPad: much larger font
        var fs = 160 + Math.random() * 100;
        el.style.left = (x - fs * 0.6) + 'px';
        el.style.top  = (y - fs * 0.4) + 'px';
        el.style.fontSize = fs + 'px';
        el.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
        el.style.fontWeight = '700';
        // Alternating gold/blue
        window._acf = !window._acf;
        el.style.color = window._acf ? '#FFD700' : '#6DB8FF';
        el.style.textShadow = window._acf
          ? '0 0 30px rgba(255,215,0,0.9)'
          : '0 0 30px rgba(109,184,255,0.9)';
        zone.appendChild(el);
        setTimeout(function() { el.remove(); }, 2400);
      };
    }

    // Patch spawnRV too
    if (typeof window.spawnRV === 'function') {
      window.spawnRV = function(e, zone) {
        var r = zone.getBoundingClientRect();
        var x, y;
        if (e.touches && e.touches[0]) {
          x = e.touches[0].clientX - r.left;
          y = e.touches[0].clientY - r.top;
        } else {
          x = e.clientX - r.left;
          y = e.clientY - r.top;
        }
        var el = document.createElement('div');
        el.className = 'fn-rv';
        var fs = 64 + Math.random() * 28;
        el.innerHTML =
          '<span style="font-size:' + fs + 'px;font-family:Noto Sans Devanagari,sans-serif;font-weight:700">राधावल्लभ</span>' +
          '<span style="font-size:' + (fs * 0.88) + 'px;font-family:Noto Sans Devanagari,sans-serif;font-weight:700">श्री हरिवंश</span>';
        el.style.left = (x - fs * 1.4) + 'px';
        el.style.top  = (y - fs * 0.5) + 'px';
        window._acf = !window._acf;
        el.style.color = window._acf ? '#FFD700' : '#6DB8FF';
        el.style.textShadow = window._acf
          ? '0 0 30px rgba(255,215,0,0.9)'
          : '0 0 30px rgba(109,184,255,0.9)';
        zone.appendChild(el);
        setTimeout(function() { el.remove(); }, 2400);
      };
    }
  }, 600);
});

console.log('✅ ipad-patch.js loaded — Bell, Rings, 28Names, Nav all patched');

})(); // end IIFE
