/* ============================================================
   Landing Page JavaScript — Balasara
   ============================================================ */

/* ── Navbar scroll effect ────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

/* ── Mobile menu toggle ──────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const icon = hamburger.querySelector('i');
  icon.className = mobileMenu.classList.contains('open') ? 'ti ti-x' : 'ti ti-menu-2';
});
// Close on link click
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.querySelector('i').className = 'ti ti-menu-2';
  });
});

/* ── Animated number counters ────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * target);
    el.textContent = current.toLocaleString('id-ID') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ── IntersectionObserver for scroll animations ──────────── */
const animateObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animateObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.animate-in').forEach(el => animateObserver.observe(el));

// Counter observer
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));

/* ── Smooth scroll for anchor links ─────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') {
      e.preventDefault();
      return;
    }
    try {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch(err) {}
  });
});

/* ── WhatsApp demo — conversation scenarios ──────────────── */
const scenarios = {
  price: [
    { type: 'in',  text: 'Halo, kaos polos putih harganya berapa ya kak?' },
    { type: 'out', text: 'Halo kak! Kaos polos putih kami mulai dari Rp 45.000 (S–XL) dan Rp 50.000 (XXL) 😊 Mau langsung order atau ada ukuran yang mau dicek?' },
    { type: 'in',  text: 'Ada diskon gak kalau beli 10 pcs?' },
    { type: 'out', text: 'Ada dong kak! Beli 10+ pcs dapat diskon 10%, jadi Rp 40.500/pcs. Mau kami buatkan pesanannya? ✅' },
  ],
  order: [
    { type: 'in',  text: 'Pesan 3 pcs kaos hitam ukuran L dong' },
    { type: 'out', text: 'Siap kak! Total 3 pcs kaos hitam L = Rp 135.000. Boleh konfirmasi nama & alamat pengirimannya ya? 📦' },
    { type: 'in',  text: 'Atas nama Budi, kirim ke Jl. Merdeka No. 5, Bandung' },
    { type: 'out', text: 'Oke kak Budi! Pesanan dicatat. Metode pembayaran: Transfer BCA 1234-5678-90 atau COD? Kami proses setelah konfirmasi ✅' },
  ],
  complaint: [
    { type: 'in',  text: 'Barang yang saya terima rusak, kecewa banget!' },
    { type: 'out', text: 'Aduh, maaf banget ya kak 🙏 Boleh kasih tahu nomor pesanannya? Kami langsung cek sekarang.' },
    { type: 'in',  text: 'Nomor pesanan #ORD-2847' },
    { type: 'out', text: 'Terima kasih kak. Pesanan #ORD-2847 sudah kami eskalasi ke tim — owner akan hubungi kak dalam 15 menit ⚠️' },
  ],
};

let currentScenario = 'price';
let animationTimeout = null;

function clearMessages() {
  const area = document.getElementById('demoChatArea');
  if (!area) return;
  area.innerHTML = '';
}

function createBubble(msg, delay) {
  return new Promise(resolve => {
    setTimeout(() => {
      const area = document.getElementById('demoChatArea');
      if (!area) { resolve(); return; }

      if (msg.type === 'out') {
        // Show typing first
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        area.appendChild(typing);
        area.scrollTop = area.scrollHeight;

        setTimeout(() => {
          typing.remove();
          const bubble = document.createElement('div');
          bubble.className = 'phone-msg-out';
          bubble.innerHTML = `${msg.text}<div class="phone-time">${getTime()} ✓✓</div>`;
          bubble.style.animation = 'slideIn 0.3s ease';
          area.appendChild(bubble);
          area.scrollTop = area.scrollHeight;
          resolve();
        }, 900);
      } else {
        const bubble = document.createElement('div');
        bubble.className = 'phone-msg-in';
        bubble.innerHTML = `${msg.text}<div class="phone-time">${getTime()}</div>`;
        bubble.style.animation = 'slideIn 0.3s ease';
        area.appendChild(bubble);
        area.scrollTop = area.scrollHeight;
        resolve();
      }
    }, delay);
  });
}

function getTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

async function playScenario(key) {
  clearTimeout(animationTimeout);
  clearMessages();
  currentScenario = key;

  const msgs = scenarios[key];
  let delay = 0;
  for (const msg of msgs) {
    await createBubble(msg, delay);
    delay = msg.type === 'out' ? 400 : 600;
    await new Promise(r => setTimeout(r, delay));
  }
}

// Scenario tab clicks
document.querySelectorAll('.scenario-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.scenario-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    playScenario(tab.dataset.scenario);
  });
});

// Auto-play on demo section entering viewport
const demoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      playScenario(currentScenario);
      demoObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const demoSection = document.getElementById('demoSection');
if (demoSection) demoObserver.observe(demoSection);

/* ── Hero phone animation (auto-play on load) ────────────── */
const heroMessages = [
  { type: 'in',  text: 'Halo, ada promo hari ini?' },
  { type: 'out', text: 'Halo kak! Ada promo weekend: diskon 15% semua produk 😊 Mau lihat katalognya?' },
  { type: 'in',  text: 'Mau dong, kirim daftar harganya ya' },
  { type: 'out', text: 'Oke kak! Ini katalog kami: Kaos polos Rp 45rb, Kemeja Rp 95rb, Celana Rp 120rb. Langsung order? ✅' },
];

async function playHeroAnimation() {
  const area = document.getElementById('heroMessages');
  if (!area) return;

  for (const msg of heroMessages) {
    await new Promise(resolve => {
      setTimeout(async () => {
        if (msg.type === 'out') {
          const typing = document.createElement('div');
          typing.className = 'typing-indicator';
          typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
          area.appendChild(typing);
          area.scrollTop = area.scrollHeight;

          await new Promise(r => setTimeout(r, 1200));
          typing.remove();
          const bubble = document.createElement('div');
          bubble.className = 'phone-msg-out';
          bubble.innerHTML = `${msg.text}<div class="phone-time">${getTime()} ✓✓</div>`;
          bubble.style.animation = 'slideIn 0.3s ease';
          area.appendChild(bubble);
        } else {
          const bubble = document.createElement('div');
          bubble.className = 'phone-msg-in';
          bubble.innerHTML = `${msg.text}<div class="phone-time">${getTime()}</div>`;
          bubble.style.animation = 'slideIn 0.3s ease';
          area.appendChild(bubble);
        }
        area.scrollTop = area.scrollHeight;
        resolve();
      }, 300);
    });
    await new Promise(r => setTimeout(r, msg.type === 'in' ? 1000 : 800));
  }

  // Loop after pause
  setTimeout(() => {
    area.innerHTML = '';
    playHeroAnimation();
  }, 4000);
}

// Start hero animation after page load
window.addEventListener('load', () => {
  setTimeout(playHeroAnimation, 1200);
});
