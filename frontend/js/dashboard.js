/* ============================================================
   Dashboard JavaScript — Balasara
   Mock data + interactions
   ============================================================ */

/* ── Sidebar collapse ────────────────────────────────────── */
const sidebar = document.getElementById('sidebar');
const dashMain = document.getElementById('dashMain');
const toggleBtn = document.getElementById('sidebarToggle');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

/* ── Navigation panel switching ─────────────────────────── */
const navItems = document.querySelectorAll('.nav-item[data-panel]');
const panels   = document.querySelectorAll('.panel');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const panelId = item.dataset.panel;
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
    // Update topbar title
    const label = item.querySelector('.nav-label')?.textContent || '';
    document.getElementById('topbarTitle').textContent = label;
  });
});

/* ── Chat contact selection ──────────────────────────────── */
const chatContacts = document.querySelectorAll('.conv-item[data-chat]');
chatContacts.forEach(c => {
  c.addEventListener('click', () => {
    chatContacts.forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    loadConversation(c.dataset.chat);
    // Remove unread badge
    const badge = c.querySelector('.conv-unread');
    if (badge) badge.remove();
  });
});

/* ── Mock conversation data ──────────────────────────────── */
const conversations = {
  budi: {
    name: 'Budi Santoso',
    phone: '+62 812-3456-7890',
    avatar: 'BS',
    avatarClass: 'green',
    stage: 'converted',
    messages: [
      { type: 'in',  text: 'Halo, ada kaos polos putih ukuran L?', time: '10:20', intent: null },
      { type: 'out', text: 'Halo kak Budi! Ada kak, kaos putih L Rp 45.000 😊 Langsung order?', time: '10:20', intent: 'PRICE_INQUIRY' },
      { type: 'in',  text: 'Iya, pesan 5 pcs dong', time: '10:22', intent: null },
      { type: 'out', text: 'Siap kak! 5 pcs × Rp 45.000 = Rp 225.000. Boleh konfirmasi alamat pengirimannya? 📦', time: '10:22', intent: 'ORDER_INTENT' },
      { type: 'in',  text: 'Kirim ke Jl. Sudirman No. 10, Jakarta Selatan', time: '10:24', intent: null },
      { type: 'out', text: 'Oke kak Budi! Pesanan dikonfirmasi. Transfer ke BCA 1234-5678-90 ya. Kami proses setelah pembayaran masuk ✅', time: '10:24', intent: 'ORDER_INTENT' },
    ]
  },
  siti: {
    name: 'Siti Rahayu',
    phone: '+62 856-9012-3456',
    avatar: 'SR',
    avatarClass: 'coral',
    stage: 'escalated',
    messages: [
      { type: 'in',  text: 'Barang yang saya terima rusak, jahitannya lepas!', time: '09:15', intent: null },
      { type: 'out', text: 'Aduh, maaf banget ya kak 🙏 Boleh kasih tahu nomor pesanannya?', time: '09:15', intent: 'COMPLAINT' },
      { type: 'in',  text: 'Nomor pesanan ORD-2847', time: '09:16', intent: null },
      { type: 'out', text: 'Terima kasih kak. Pesanan ORD-2847 sudah kami eskalasi ke tim. Owner akan hubungi kak dalam 15 menit ⚠️', time: '09:16', intent: 'COMPLAINT' },
    ]
  },
  andi: {
    name: 'Andi Wijaya',
    phone: '+62 821-5678-9012',
    avatar: 'AW',
    avatarClass: 'amber',
    stage: 'active',
    messages: [
      { type: 'in',  text: 'Toko buka sampai jam berapa?', time: '11:30', intent: null },
      { type: 'out', text: 'Halo kak Andi! Toko kami buka 08.00–22.00 WIB setiap hari 😊 Ada yang bisa dibantu?', time: '11:30', intent: 'GENERAL_INFO' },
      { type: 'in',  text: 'Ada kemeja batik gak?', time: '11:31', intent: null },
      { type: 'out', text: 'Ada kak! Kemeja batik mulai Rp 125.000. Tersedia motif Parang, Kawung, dan Mega Mendung. Mau lihat foto produknya? 😊', time: '11:32', intent: 'PRICE_INQUIRY' },
    ]
  },
  dewi: {
    name: 'Dewi Lestari',
    phone: '+62 877-3456-7890',
    avatar: 'DL',
    avatarClass: 'purple',
    stage: 'active',
    messages: [
      { type: 'in',  text: 'Kak, pesanan saya sudah dikirim belum ya?', time: '08:45', intent: null },
      { type: 'out', text: 'Halo kak Dewi! Boleh kasih nomor pesanannya kak? Kami langsung cek status pengirimannya 📦', time: '08:45', intent: 'FOLLOW_UP_CHECK' },
      { type: 'in',  text: 'ORD-2901', time: '08:46', intent: null },
      { type: 'out', text: 'Pesanan ORD-2901 sudah dikirim via JNE hari ini jam 09.00. Nomor resi: JNE1234567890. Estimasi tiba 2–3 hari ✅', time: '08:47', intent: 'FOLLOW_UP_CHECK' },
    ]
  },
  rudi: {
    name: 'Rudi Hermawan',
    phone: '+62 813-2109-8765',
    avatar: 'RH',
    avatarClass: 'teal',
    stage: 'active',
    messages: [
      { type: 'in',  text: 'Harga celana jeans pria berapa?', time: '12:10', intent: null },
      { type: 'out', text: 'Halo kak! Celana jeans pria kami mulai Rp 185.000 untuk slim fit, Rp 220.000 untuk regular fit 😊 Ukuran yang dicari berapa?', time: '12:10', intent: 'PRICE_INQUIRY' },
    ]
  },
};

const intentColors = {
  'PRICE_INQUIRY': { class: 'badge-green',  label: 'Harga' },
  'ORDER_INTENT':  { class: 'badge-purple', label: 'Order' },
  'COMPLAINT':     { class: 'badge-coral',  label: 'Komplain' },
  'GENERAL_INFO':  { class: 'badge-dark',   label: 'Info' },
  'FOLLOW_UP_CHECK': { class: 'badge-amber', label: 'Follow-up' },
};

function loadConversation(key) {
  const conv = conversations[key];
  if (!conv) return;

  // Update header
  document.getElementById('chatContactAvatar').className = `conv-avatar ${conv.avatarClass}`;
  document.getElementById('chatContactAvatar').textContent = conv.avatar;
  document.getElementById('chatContactName').textContent = conv.name;
  document.getElementById('chatContactPhone').textContent = conv.phone;

  // Stage badge
  const stageBadge = document.getElementById('chatStageBadge');
  const stageMap = {
    active: { class: 'badge-green', label: 'Aktif' },
    converted: { class: 'badge-purple', label: 'Terkonversi' },
    escalated: { class: 'badge-coral', label: 'Eskalasi' },
  };
  const stage = stageMap[conv.stage] || stageMap.active;
  stageBadge.className = `badge ${stage.class}`;
  stageBadge.textContent = stage.label;

  // Messages
  const area = document.getElementById('chatMessagesArea');
  area.innerHTML = `
    <div class="date-separator">
      <span>Hari ini</span>
    </div>
  `;

  conv.messages.forEach(msg => {
    const group = document.createElement('div');
    group.className = `msg-group ${msg.type}`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = msg.text;

    const timeRow = document.createElement('div');
    timeRow.className = 'msg-time-row';
    timeRow.innerHTML = `<span>${msg.time} WIB</span>`;

    if (msg.intent && intentColors[msg.intent]) {
      const intentBadge = document.createElement('span');
      intentBadge.className = `badge ${intentColors[msg.intent].class} msg-intent-badge`;
      intentBadge.style.fontSize = '10px';
      intentBadge.style.padding = '2px 6px';
      intentBadge.textContent = intentColors[msg.intent].label;
      timeRow.appendChild(intentBadge);
    }

    if (msg.type === 'out') {
      timeRow.innerHTML += ' <i class="ti ti-checks" style="color:#34B7F1;font-size:12px;"></i>';
    }

    group.appendChild(bubble);
    group.appendChild(timeRow);
    area.appendChild(group);
  });

  area.scrollTop = area.scrollHeight;
}

/* ── Chat send button ────────────────────────────────────── */
const chatInput = document.getElementById('chatInput');
const sendBtn   = document.getElementById('chatSendBtn');

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const area = document.getElementById('chatMessagesArea');
  const group = document.createElement('div');
  group.className = 'msg-group out';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  const timeRow = document.createElement('div');
  timeRow.className = 'msg-time-row';
  const now = new Date();
  timeRow.innerHTML = `<span>${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB</span> <i class="ti ti-check" style="color:var(--g-muted);font-size:12px;"></i>`;

  group.appendChild(bubble);
  group.appendChild(timeRow);
  area.appendChild(group);
  area.scrollTop = area.scrollHeight;

  chatInput.value = '';
  chatInput.style.height = 'auto';
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

/* ── Bot toggle chip ─────────────────────────────────────── */
const botToggleChip = document.getElementById('botToggleChip');
let botActive = true;
botToggleChip.addEventListener('click', () => {
  botActive = !botActive;
  botToggleChip.classList.toggle('paused', !botActive);
  botToggleChip.innerHTML = botActive
    ? '<span class="bot-status-dot" style="width:7px;height:7px;border-radius:50%;background:var(--g-lime);animation:pulse 2s infinite;"></span> Bot Aktif'
    : '<i class="ti ti-player-pause" style="font-size:14px;"></i> Bot Dijeda';
});

/* ── Escalation button ───────────────────────────────────── */
const escalateBtn = document.getElementById('escalateBtn');
if (escalateBtn) {
  escalateBtn.addEventListener('click', () => {
    showToast('⚠️ Eskalasi dikirim ke owner!', 'coral');
  });
}

/* ── Toast notification ──────────────────────────────────── */
function showToast(message, type = 'green') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    background: ${type === 'coral' ? 'var(--g-coral)' : 'var(--g-dark)'};
    color: #fff; padding: 12px 20px;
    border-radius: var(--r-md); box-shadow: var(--shadow-lg);
    font-family: var(--font-jakarta); font-size: 14px; font-weight: 600;
    z-index: 9999; display: flex; align-items: center; gap: 10px;
    animation: slideIn 0.3s ease;
    border-left: 3px solid ${type === 'coral' ? '#fff' : 'var(--g-lime)'};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ── Animated stat counters ──────────────────────────────── */
function animateDashCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * target);
    el.textContent = current.toLocaleString('id-ID') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

document.querySelectorAll('[data-dash-counter]').forEach(el => {
  animateDashCounter(el);
});

/* ── Chart.js setup ────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Setup Chart
  const ctx = document.getElementById('volumeChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        datasets: [{
          label: 'Pesan Masuk',
          data: [120, 190, 150, 220, 180, 250, 210],
          borderColor: '#00AA5B',
          backgroundColor: 'rgba(0,170,91,0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Interactive header buttons
  const botToggleChip = document.getElementById('botToggleChip');
  const botToggleText = document.getElementById('botToggleText');
  if (botToggleChip) {
    botToggleChip.addEventListener('click', () => {
      botToggleChip.classList.toggle('off');
      if (botToggleChip.classList.contains('off')) {
        botToggleChip.style.background = 'rgba(255,255,255,0.1)';
        botToggleChip.style.color = '#ccc';
        if(botToggleText) botToggleText.textContent = 'Bot Nonaktif';
      } else {
        botToggleChip.style.background = 'rgba(0,170,91,0.15)';
        botToggleChip.style.color = 'var(--g-lime)';
        if(botToggleText) botToggleText.textContent = 'Bot Aktif';
      }
    });
  }

  const escalateBtn = document.getElementById('escalateBtn');
  if (escalateBtn) {
    escalateBtn.addEventListener('click', () => {
      alert('Eskalasi diaktifkan! Pesan selanjutnya akan diarahkan ke CS manusia.');
    });
  }
});

/* ── SVG Donut chart ─────────────────────────────────────── */
function buildDonut() {
  const svg = document.getElementById('intentDonut');
  if (!svg) return;

  const data = [
    { label: 'Tanya Harga',  pct: 38, color: '#00AA5B' },
    { label: 'Order',        pct: 29, color: '#6C47FF' },
    { label: 'Follow-up',    pct: 18, color: '#F5A623' },
    { label: 'Komplain',     pct: 9,  color: '#FF6B4A' },
    { label: 'Lainnya',      pct: 6,  color: '#8E8EA8' },
  ];

  const r = 44, cx = 60, cy = 60, stroke = 16;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const circles = data.map(d => {
    const dash = (d.pct / 100) * circumference;
    const gap  = circumference - dash;
    const rotation = -90 + (offset / 100) * 360;
    offset += d.pct;
    return { ...d, dash, gap, rotation };
  });

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="var(--g-border)" stroke-width="${stroke}" />
    ${circles.map(c => `
      <circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none" stroke="${c.color}" stroke-width="${stroke}"
        stroke-dasharray="${c.dash} ${c.gap}"
        stroke-linecap="butt"
        transform="rotate(${c.rotation} ${cx} ${cy})"
        style="transition: stroke-dasharray 0.8s ease" />
    `).join('')}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle"
      font-family="Plus Jakarta Sans" font-weight="800" font-size="18"
      fill="var(--g-dark)">1.2K</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle"
      font-family="Inter" font-size="10" fill="var(--g-muted)">pesan hari ini</text>
  `;

  // Legend
  const legend = document.getElementById('intentLegend');
  if (!legend) return;
  legend.innerHTML = data.map(d => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${d.color}"></div>
      <span>${d.label}</span>
      <span class="legend-pct">${d.pct}%</span>
    </div>
  `).join('');
}

buildDonut();

/* ── Live clock in topbar ────────────────────────────────── */
function updateClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  el.textContent = `${days[now.getDay()]}, ${now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})} WIB`;
}
updateClock();
setInterval(updateClock, 60000);

/* ── Scroll-fade animations for dashboard cards ──────────── */
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.stat-card, .dash-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
  cardObserver.observe(el);
});

/* ── Initialize first conversation ──────────────────────── */
setTimeout(() => {
  const firstContact = document.querySelector('.conv-item[data-chat]');
  if (firstContact) {
    firstContact.click();
  }
}, 100);

/* ── Notification bell demo ─────────────────────────────── */
document.getElementById('notifBtn')?.addEventListener('click', () => {
  showToast('📨 3 pesan baru dari pelanggan!', 'green');
});
