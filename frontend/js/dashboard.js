/* ============================================================
   Dashboard JavaScript — Balasara
   Fully connected to backend API with auth + message log
   ============================================================ */

/* ── Config ─────────────────────────────────────────────────── */
const API_BASE  = window.BALASARA_API || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://balasara.onrender.com');
const IS_DEMO   = localStorage.getItem('balasara_demo') === 'true';

/* ── Auth helpers ────────────────────────────────────────────── */
function getToken() { return localStorage.getItem('balasara_token'); }
function getBusinessName() { return localStorage.getItem('balasara_business') || 'Bisnis Saya'; }

function logout() {
  localStorage.removeItem('balasara_token');
  localStorage.removeItem('balasara_tenant_id');
  localStorage.removeItem('balasara_business');
  localStorage.removeItem('balasara_demo');
  window.location.replace('login.html');
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token && token !== 'demo_mode' ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) { logout(); return null; }
  return res;
}

/* ── Toast notification ──────────────────────────────────────── */
function showToast(message, type = 'green') {
  const toast = document.createElement('div');
  const colors = { green: 'var(--g-green)', coral: 'var(--g-coral)', amber: 'var(--g-amber)', purple: 'var(--g-purple)' };
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;
    background:var(--g-dark);color:#fff;padding:12px 20px;
    border-radius:var(--r-md);box-shadow:var(--shadow-lg);
    font-family:var(--font-jakarta);font-size:14px;font-weight:600;
    z-index:9999;display:flex;align-items:center;gap:10px;
    animation:slideIn 0.3s ease;
    border-left:3px solid ${colors[type] || colors.green};
    max-width:320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ── Sidebar collapse ─────────────────────────────────────────── */
const sidebar   = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
toggleBtn?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

/* ── Navigation panel switching ─────────────────────────────── */
const navItems = document.querySelectorAll('.nav-item[data-panel]');
const panels   = document.querySelectorAll('.panel');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navItems.forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
    panels.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    item.setAttribute('aria-current', 'page');
    const panel = document.getElementById(item.dataset.panel);
    if (panel) panel.classList.add('active');
    const label = item.querySelector('.nav-label')?.textContent || '';
    document.getElementById('topbarTitle').textContent = label;
    document.getElementById('breadcrumbCurrent').textContent = label;

    // Load data for specific panels
    if (item.dataset.panel === 'panelMessageLog') loadMessageLog();
    if (item.dataset.panel === 'panelSettings') loadSettings();
  });
});

/* ── User dropdown (topbar avatar) ──────────────────────────── */
const topbarAvatar  = document.getElementById('topbarAvatar');
const userDropdown  = document.getElementById('userDropdown');

topbarAvatar?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = userDropdown.classList.toggle('open');
  topbarAvatar.setAttribute('aria-expanded', open);
});
document.addEventListener('click', () => {
  userDropdown?.classList.remove('open');
  topbarAvatar?.setAttribute('aria-expanded', 'false');
});

/* ── Logout buttons ──────────────────────────────────────────── */
['dropdownLogoutBtn','sidebarLogoutBtn','logoutBtnSettings'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    if (confirm('Yakin ingin logout dari Balasara Dashboard?')) logout();
  });
});

/* ── Navigate to settings from dropdown ─────────────────────── */
document.getElementById('dropdownSettingsBtn')?.addEventListener('click', () => {
  document.getElementById('navSettings')?.click();
  userDropdown?.classList.remove('open');
});

/* ── Init user info in topbar + sidebar ──────────────────────── */
function initUserUI(tenant) {
  const bizName = tenant?.businessName || getBusinessName();
  const email   = tenant?.email || '';
  const plan    = tenant?.plan  || 'trial';
  const initials = bizName.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || 'B';

  // Topbar avatar
  if (topbarAvatar) topbarAvatar.textContent = initials;
  const dropBiz   = document.getElementById('dropdownBizName');
  const dropEmail = document.getElementById('dropdownEmail');
  if (dropBiz)   dropBiz.textContent   = bizName;
  if (dropEmail) dropEmail.textContent = email;

  // Topbar breadcrumb title
  const topbarBizEl = document.getElementById('topbarBusiness');
  if (topbarBizEl) topbarBizEl.textContent = bizName;

  // Settings panel
  const avCircle = document.getElementById('settingsAvatarCircle');
  if (avCircle) avCircle.textContent = initials;
  const bizDisp  = document.getElementById('settingsBizNameDisplay');
  if (bizDisp)  bizDisp.textContent  = bizName;
  const emlDisp  = document.getElementById('settingsEmailDisplay');
  if (emlDisp)  emlDisp.textContent  = email;
  const planBadge = document.getElementById('settingsPlanBadge');
  if (planBadge) {
    const planLabel = { trial: 'Trial', basic: 'Basic', pro: 'Pro 🚀' };
    planBadge.textContent = planLabel[plan] || 'Trial';
  }

  // Pre-fill settings form
  const bizInput = document.getElementById('settingsBusinessName');
  if (bizInput) bizInput.value = bizName;

  // Webhook URL hint
  const webhookEl = document.getElementById('webhookUrlDisplay');
  if (webhookEl) webhookEl.textContent = `${API_BASE}/webhook`;

  // MetaConfig fields
  if (tenant?.metaConfig) {
    const mc = tenant.metaConfig;
    setVal('settingsPhoneId',    mc.wabaPhoneId);
    setVal('settingsVerifyToken', mc.verifyToken);
    // Access token + secret are masked by server — don't pre-fill
  }

  // Bot settings panel hours
  const hoursEl = document.getElementById('sidebarHours');
  if (hoursEl) hoursEl.textContent = tenant?.operatingHours || '08.00–22.00 WIB';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}

/* ── Load tenant profile on init ────────────────────────────── */
async function loadProfile() {
  if (IS_DEMO) {
    initUserUI({ businessName: 'Demo Toko', email: 'demo@balasara.id', plan: 'pro' });
    return;
  }
  try {
    const res = await apiFetch('/settings/me');
    if (!res || !res.ok) return;
    const tenant = await res.json();
    localStorage.setItem('balasara_business', tenant.businessName);
    initUserUI(tenant);
  } catch (err) {
    console.warn('[Profile]', err.message);
    // Fallback to local storage
    initUserUI({ businessName: getBusinessName() });
  }
}

/* ── Load Settings ───────────────────────────────────────────── */
async function loadSettings() {
  if (IS_DEMO) {
    showToast('Mode demo — pengaturan tidak tersambung ke server.', 'amber');
    return;
  }
  try {
    const res = await apiFetch('/settings/me');
    if (!res || !res.ok) return;
    const tenant = await res.json();
    initUserUI(tenant);
  } catch (err) {
    console.warn('[Settings]', err.message);
  }
}

/* ── Save business name ──────────────────────────────────────── */
document.getElementById('saveBusinessNameBtn')?.addEventListener('click', async () => {
  const bizName = document.getElementById('settingsBusinessName')?.value?.trim();
  if (!bizName) return showToast('Nama bisnis tidak boleh kosong.', 'coral');
  if (IS_DEMO) return showToast('Mode demo — tidak dapat menyimpan.', 'amber');
  try {
    const res = await apiFetch('/settings/business', {
      method: 'PUT',
      body: JSON.stringify({ businessName: bizName }),
    });
    if (!res || !res.ok) throw new Error('Gagal menyimpan.');
    localStorage.setItem('balasara_business', bizName);
    showToast('✅ Nama bisnis berhasil disimpan!', 'green');
    loadProfile();
  } catch (err) {
    showToast('❌ ' + err.message, 'coral');
  }
});

/* ── Save WhatsApp credentials ───────────────────────────────── */
document.getElementById('saveMetaBtn')?.addEventListener('click', async () => {
  if (IS_DEMO) return showToast('Mode demo — tidak dapat menyimpan.', 'amber');
  const payload = {
    wabaPhoneId:    document.getElementById('settingsPhoneId')?.value?.trim(),
    wabaAccessToken: document.getElementById('settingsAccessToken')?.value?.trim(),
    wabaAppSecret:  document.getElementById('settingsAppSecret')?.value?.trim(),
    verifyToken:    document.getElementById('settingsVerifyToken')?.value?.trim(),
  };
  try {
    const res = await apiFetch('/settings/meta', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res || !res.ok) throw new Error('Gagal menyimpan kredensial.');
    showToast('✅ Kredensial WhatsApp berhasil disimpan!', 'green');
  } catch (err) {
    showToast('❌ ' + err.message, 'coral');
  }
});

/* ══════════════════════════════════════════════════════════════
   MESSAGE LOG
══════════════════════════════════════════════════════════════ */
let msgLogPage = 1;
let msgLogPages = 1;
let msgLogCurrentIntent = 'ALL';

const INTENT_META = {
  PRICE_INQUIRY:   { label: 'Tanya Harga',  cls: 'badge-green' },
  ORDER_INTENT:    { label: 'Order',         cls: 'badge-purple' },
  COMPLAINT:       { label: 'Komplain',      cls: 'badge-coral' },
  GENERAL_INFO:    { label: 'Info Umum',     cls: 'badge-dark' },
  FOLLOW_UP_CHECK: { label: 'Follow-up',     cls: 'badge-amber' },
  UNKNOWN:         { label: 'Unknown',       cls: 'badge-dark' },
};

// Demo data for when backend is not running
const DEMO_MESSAGES = [
  { id:1, from:'628123456789', text:'Halo, ada kaos putih ukuran L?',          intent:'PRICE_INQUIRY',   confidence:0.95, reply:'Halo kak! Ada, kaos putih L Rp 45.000 😊 Langsung order?',           createdAt: new Date(Date.now()-60000*5).toISOString() },
  { id:2, from:'628856901234', text:'Barang saya rusak, jahitan lepas!',        intent:'COMPLAINT',       confidence:0.98, reply:'Maaf sekali kak 🙏 Boleh kasih nomor pesanannya?',                    createdAt: new Date(Date.now()-60000*22).toISOString() },
  { id:3, from:'628215678901', text:'Toko buka sampai jam berapa?',             intent:'GENERAL_INFO',    confidence:0.91, reply:'Halo kak! Kami buka 08.00–22.00 WIB setiap hari 😊',                 createdAt: new Date(Date.now()-60000*45).toISOString() },
  { id:4, from:'628773456789', text:'Pesanan saya ORD-2901 sudah dikirim?',    intent:'FOLLOW_UP_CHECK', confidence:0.89, reply:'Pesanan ORD-2901 dikirim via JNE, resi JNE1234567890 ✅',             createdAt: new Date(Date.now()-60000*80).toISOString() },
  { id:5, from:'628132109876', text:'Harga celana jeans pria berapa?',          intent:'PRICE_INQUIRY',   confidence:0.97, reply:'Celana jeans pria mulai Rp 185.000 slim fit 😊',                     createdAt: new Date(Date.now()-60000*110).toISOString() },
  { id:6, from:'628987654321', text:'Mau pesan 3 pcs kaos hitam size M',        intent:'ORDER_INTENT',    confidence:0.94, reply:'Siap kak! 3 pcs × Rp 45.000. Boleh konfirmasi nama & alamat? 📦',  createdAt: new Date(Date.now()-60000*140).toISOString() },
  { id:7, from:'628765432198', text:'Ada promo gak hari ini?',                  intent:'PRICE_INQUIRY',   confidence:0.83, reply:'Halo kak! Untuk promo terkini, silakan tanyakan lebih lanjut 😊',   createdAt: new Date(Date.now()-60000*200).toISOString() },
  { id:8, from:'628654321987', text:'Komplain nih, produk tidak sesuai foto!',  intent:'COMPLAINT',       confidence:0.96, reply:'Aduh, maaf banget ya kak 🙏 Boleh minta nomor pesanannya?',          createdAt: new Date(Date.now()-60000*250).toISOString() },
];

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  if (diffMin < 1)   return 'Baru saja';
  if (diffMin < 60)  return `${diffMin} mnt lalu`;
  if (diffH < 24)    return `${diffH} jam lalu`;
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function formatPhone(phone) {
  if (phone.startsWith('62')) {
    return '+62 ' + phone.slice(2).replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return phone;
}

function renderConfidenceBar(conf) {
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? '#00AA5B' : pct >= 60 ? '#F5A623' : '#FF6B4A';
  return `
    <div style="display:flex;align-items:center;gap:6px;">
      <div style="width:48px;height:4px;background:rgba(0,0,0,0.1);border-radius:99px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:99px;"></div>
      </div>
      <span style="font-size:11px;font-weight:600;color:${color};">${pct}%</span>
    </div>`;
}

function renderMessageRows(messages) {
  const tbody = document.getElementById('msgLogTbody');
  if (!tbody) return;

  if (!messages || messages.length === 0) {
    tbody.innerHTML = `
      <tr class="msglog-empty-row">
        <td colspan="6">
          <div class="msglog-empty">
            <i class="ti ti-inbox" style="font-size:28px;color:var(--g-muted);"></i>
            <span>Belum ada pesan masuk. Pesan dari pelanggan akan muncul di sini.</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = messages.map((msg, i) => {
    const im = INTENT_META[msg.intent] || INTENT_META.UNKNOWN;
    const rowClass = i % 2 === 0 ? 'msglog-row-even' : '';
    return `
      <tr class="msglog-row ${rowClass}" style="animation:fadeInRow 0.3s ease ${i * 0.04}s both;">
        <td class="msglog-td-time">
          <div class="msglog-time-main">${formatTime(msg.createdAt)}</div>
          <div class="msglog-time-sub">${new Date(msg.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div>
        </td>
        <td>
          <div class="msglog-phone">${formatPhone(msg.from)}</div>
        </td>
        <td class="msglog-td-msg">
          <div class="msglog-msg-text" title="${escapeHtml(msg.text)}">${escapeHtml(msg.text)}</div>
        </td>
        <td>
          <span class="badge ${im.cls}" style="font-size:11px;">${im.label}</span>
        </td>
        <td>${renderConfidenceBar(msg.confidence)}</td>
        <td class="msglog-td-reply">
          <div class="msglog-reply-text" title="${escapeHtml(msg.reply)}">${escapeHtml(msg.reply) || '<span style="color:var(--g-muted);font-style:italic;">—</span>'}</div>
        </td>
      </tr>`;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function loadMessageLog(page = 1) {
  msgLogPage = page;
  const intent = msgLogCurrentIntent;
  const tbody  = document.getElementById('msgLogTbody');
  const prevBtn = document.getElementById('msgLogPrevBtn');
  const nextBtn = document.getElementById('msgLogNextBtn');
  const pageInfo = document.getElementById('msgLogPageInfo');

  // Loading state
  if (tbody) tbody.innerHTML = `
    <tr class="msglog-empty-row"><td colspan="6">
      <div class="msglog-empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite;"></i><span>Memuat data pesan...</span></div>
    </td></tr>`;

  if (IS_DEMO) {
    // Use demo data
    await new Promise(r => setTimeout(r, 600));
    const filtered = DEMO_MESSAGES.filter(m => intent === 'ALL' || m.intent === intent);
    renderMessageRows(filtered);
    renderMsgLogStats({ totalMessages: DEMO_MESSAGES.length, todayMessages: 5, intentBreakdown: { ORDER_INTENT: 2, COMPLAINT: 2 } });
    if (pageInfo) pageInfo.textContent = 'Demo Mode';
    if (prevBtn)  prevBtn.disabled = true;
    if (nextBtn)  nextBtn.disabled = true;
    return;
  }

  try {
    const params = new URLSearchParams({ page, limit: 25, ...(intent !== 'ALL' && { intent }) });
    const [msgRes, statsRes] = await Promise.all([
      apiFetch(`/settings/messages?${params}`),
      apiFetch('/settings/stats'),
    ]);

    if (!msgRes || !msgRes.ok) throw new Error('Gagal memuat pesan.');
    const { messages, total, pages } = await msgRes.json();
    msgLogPages = pages || 1;

    renderMessageRows(messages);

    if (pageInfo) pageInfo.textContent = `Halaman ${page} dari ${msgLogPages} (${total} total)`;
    if (prevBtn)  prevBtn.disabled = page <= 1;
    if (nextBtn)  nextBtn.disabled = page >= msgLogPages;

    if (statsRes && statsRes.ok) {
      const stats = await statsRes.json();
      renderMsgLogStats(stats);
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `
      <tr class="msglog-empty-row"><td colspan="6">
        <div class="msglog-empty">
          <i class="ti ti-wifi-off" style="font-size:24px;color:var(--g-coral);"></i>
          <span>Tidak dapat terhubung ke server. Pastikan backend berjalan di <strong>${API_BASE}</strong>.</span>
        </div>
      </td></tr>`;
  }
}

function renderMsgLogStats(stats) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
  set('mlsTotal',     stats.totalMessages?.toLocaleString('id-ID') || '—');
  set('mlsToday',     stats.todayMessages?.toLocaleString('id-ID') || '—');
  set('mlsOrders',    stats.intentBreakdown?.ORDER_INTENT?.toLocaleString('id-ID') || '0');
  set('mlsComplaints',stats.intentBreakdown?.COMPLAINT?.toLocaleString('id-ID') || '0');
}

// Pagination buttons
document.getElementById('msgLogPrevBtn')?.addEventListener('click', () => {
  if (msgLogPage > 1) loadMessageLog(msgLogPage - 1);
});
document.getElementById('msgLogNextBtn')?.addEventListener('click', () => {
  if (msgLogPage < msgLogPages) loadMessageLog(msgLogPage + 1);
});

// Intent filter
document.getElementById('msgLogIntentFilter')?.addEventListener('change', (e) => {
  msgLogCurrentIntent = e.target.value;
  loadMessageLog(1);
});

// Refresh button
document.getElementById('msgLogRefreshBtn')?.addEventListener('click', () => {
  loadMessageLog(msgLogPage);
  showToast('🔄 Log pesan diperbarui', 'green');
});

/* ══════════════════════════════════════════════════════════════
   CHAT PANEL
══════════════════════════════════════════════════════════════ */
const chatContacts = document.querySelectorAll('.conv-item[data-chat]');
chatContacts.forEach(c => {
  c.addEventListener('click', () => {
    chatContacts.forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    loadConversation(c.dataset.chat);
    const badge = c.querySelector('.conv-unread');
    if (badge) badge.remove();
  });
});

const conversations = {
  budi: {
    name:'Budi Santoso', phone:'+62 812-3456-7890', avatar:'BS', avatarClass:'green', stage:'converted',
    messages:[
      {type:'in', text:'Halo, ada kaos polos putih ukuran L?', time:'10:20', intent:null},
      {type:'out',text:'Halo kak Budi! Ada kak, kaos putih L Rp 45.000 😊 Langsung order?', time:'10:20', intent:'PRICE_INQUIRY'},
      {type:'in', text:'Iya, pesan 5 pcs dong', time:'10:22', intent:null},
      {type:'out',text:'Siap kak! 5 pcs × Rp 45.000 = Rp 225.000. Boleh konfirmasi alamat pengirimannya? 📦', time:'10:22', intent:'ORDER_INTENT'},
      {type:'in', text:'Kirim ke Jl. Sudirman No. 10, Jakarta Selatan', time:'10:24', intent:null},
      {type:'out',text:'Oke kak Budi! Pesanan dikonfirmasi. Transfer ke BCA 1234-5678-90 ya ✅', time:'10:24', intent:'ORDER_INTENT'},
    ]
  },
  siti:{
    name:'Siti Rahayu', phone:'+62 856-9012-3456', avatar:'SR', avatarClass:'coral', stage:'escalated',
    messages:[
      {type:'in', text:'Barang yang saya terima rusak, jahitannya lepas!', time:'09:15', intent:null},
      {type:'out',text:'Aduh, maaf banget ya kak 🙏 Boleh kasih tahu nomor pesanannya?', time:'09:15', intent:'COMPLAINT'},
      {type:'in', text:'Nomor pesanan ORD-2847', time:'09:16', intent:null},
      {type:'out',text:'Terima kasih kak. Pesanan ORD-2847 sudah kami eskalasi ke tim ⚠️', time:'09:16', intent:'COMPLAINT'},
    ]
  },
  andi:{
    name:'Andi Wijaya', phone:'+62 821-5678-9012', avatar:'AW', avatarClass:'amber', stage:'active',
    messages:[
      {type:'in', text:'Toko buka sampai jam berapa?', time:'11:30', intent:null},
      {type:'out',text:'Halo kak Andi! Toko kami buka 08.00–22.00 WIB setiap hari 😊', time:'11:30', intent:'GENERAL_INFO'},
      {type:'in', text:'Ada kemeja batik gak?', time:'11:31', intent:null},
      {type:'out',text:'Ada kak! Kemeja batik mulai Rp 125.000. Motif Parang, Kawung, Mega Mendung 😊', time:'11:32', intent:'PRICE_INQUIRY'},
    ]
  },
  dewi:{
    name:'Dewi Lestari', phone:'+62 877-3456-7890', avatar:'DL', avatarClass:'purple', stage:'active',
    messages:[
      {type:'in', text:'Kak, pesanan saya sudah dikirim belum?', time:'08:45', intent:null},
      {type:'out',text:'Halo kak Dewi! Boleh kasih nomor pesanannya? 📦', time:'08:45', intent:'FOLLOW_UP_CHECK'},
      {type:'in', text:'ORD-2901', time:'08:46', intent:null},
      {type:'out',text:'Pesanan ORD-2901 sudah dikirim via JNE. Resi: JNE1234567890 ✅', time:'08:47', intent:'FOLLOW_UP_CHECK'},
    ]
  },
  rudi:{
    name:'Rudi Hermawan', phone:'+62 813-2109-8765', avatar:'RH', avatarClass:'teal', stage:'active',
    messages:[
      {type:'in', text:'Harga celana jeans pria berapa?', time:'12:10', intent:null},
      {type:'out',text:'Halo kak! Celana jeans pria mulai Rp 185.000 slim fit, Rp 220.000 regular 😊', time:'12:10', intent:'PRICE_INQUIRY'},
    ]
  },
};

const intentColors = {
  PRICE_INQUIRY:   {class:'badge-green',  label:'Harga'},
  ORDER_INTENT:    {class:'badge-purple', label:'Order'},
  COMPLAINT:       {class:'badge-coral',  label:'Komplain'},
  GENERAL_INFO:    {class:'badge-dark',   label:'Info'},
  FOLLOW_UP_CHECK: {class:'badge-amber',  label:'Follow-up'},
};

function loadConversation(key) {
  const conv = conversations[key];
  if (!conv) return;
  document.getElementById('chatContactAvatar').className = `conv-avatar ${conv.avatarClass}`;
  document.getElementById('chatContactAvatar').textContent = conv.avatar;
  document.getElementById('chatContactName').textContent = conv.name;
  document.getElementById('chatContactPhone').textContent = conv.phone;

  const stageBadge = document.getElementById('chatStageBadge');
  const stageMap = {active:{class:'badge-green',label:'Aktif'}, converted:{class:'badge-purple',label:'Terkonversi'}, escalated:{class:'badge-coral',label:'Eskalasi'}};
  const stage = stageMap[conv.stage] || stageMap.active;
  stageBadge.className = `badge ${stage.class}`;
  stageBadge.textContent = stage.label;

  const area = document.getElementById('chatMessagesArea');
  area.innerHTML = `<div class="date-separator"><span>Hari ini</span></div>`;

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
      const ib = document.createElement('span');
      ib.className = `badge ${intentColors[msg.intent].class} msg-intent-badge`;
      ib.style.cssText = 'font-size:10px;padding:2px 6px;';
      ib.textContent = intentColors[msg.intent].label;
      timeRow.appendChild(ib);
    }
    if (msg.type === 'out') timeRow.innerHTML += ' <i class="ti ti-checks" style="color:#34B7F1;font-size:12px;"></i>';
    group.appendChild(bubble);
    group.appendChild(timeRow);
    area.appendChild(group);
  });
  area.scrollTop = area.scrollHeight;
}

/* ── Chat send ───────────────────────────────────────────────── */
const chatInput = document.getElementById('chatInput');
const sendBtn   = document.getElementById('chatSendBtn');

function sendMessage() {
  const text = chatInput?.value?.trim();
  if (!text) return;
  const area  = document.getElementById('chatMessagesArea');
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
  area?.appendChild(group);
  area.scrollTop = area.scrollHeight;
  chatInput.value = '';
  chatInput.style.height = 'auto';
}

sendBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
chatInput?.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

/* ── Bot toggle chip ─────────────────────────────────────────── */
const botToggleChip = document.getElementById('botToggleChip');
const botToggleText = document.getElementById('botToggleText');
botToggleChip?.addEventListener('click', () => {
  botToggleChip.classList.toggle('off');
  const isOff = botToggleChip.classList.contains('off');
  botToggleChip.style.background = isOff ? 'rgba(255,255,255,0.1)' : 'rgba(0,170,91,0.15)';
  botToggleChip.style.color = isOff ? '#ccc' : 'var(--g-lime)';
  if (botToggleText) botToggleText.textContent = isOff ? 'Bot Nonaktif' : 'Bot Aktif';
  showToast(isOff ? '⏸ Bot dijeda.' : '▶ Bot diaktifkan!', isOff ? 'amber' : 'green');
});

/* ── Escalate button ─────────────────────────────────────────── */
document.getElementById('escalateBtn')?.addEventListener('click', () => {
  showToast('⚠️ Eskalasi dikirim ke owner!', 'coral');
});

/* ── Animated stat counters ──────────────────────────────────── */
function animateDashCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const suffix   = el.dataset.suffix || '';
  const duration = 1400;
  const start    = performance.now();
  function update(time) {
    const elapsed  = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target).toLocaleString('id-ID') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
document.querySelectorAll('[data-dash-counter]').forEach(el => animateDashCounter(el));

/* ── Live clock ──────────────────────────────────────────────── */
function updateClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const now  = new Date();
  el.textContent = `${days[now.getDay()]}, ${now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})} WIB`;
}
updateClock();
setInterval(updateClock, 60000);

/* ── SVG Donut chart ─────────────────────────────────────────── */
function buildDonut() {
  const svg = document.getElementById('intentDonut');
  if (!svg) return;
  const data = [
    {label:'Tanya Harga', pct:38, color:'#00AA5B'},
    {label:'Order',       pct:29, color:'#6C47FF'},
    {label:'Follow-up',   pct:18, color:'#F5A623'},
    {label:'Komplain',    pct:9,  color:'#FF6B4A'},
    {label:'Lainnya',     pct:6,  color:'#8E8EA8'},
  ];
  const r=44,cx=60,cy=60,stroke=16;
  const circ = 2*Math.PI*r;
  let offset = 0;
  const circles = data.map(d => {
    const dash = (d.pct/100)*circ, gap = circ-dash;
    const rotation = -90+(offset/100)*360;
    offset += d.pct;
    return {...d, dash, gap, rotation};
  });
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--g-border)" stroke-width="${stroke}"/>
    ${circles.map(c=>`
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.color}" stroke-width="${stroke}"
        stroke-dasharray="${c.dash} ${c.gap}" stroke-linecap="butt"
        transform="rotate(${c.rotation} ${cx} ${cy})" style="transition:stroke-dasharray 0.8s ease"/>
    `).join('')}
    <text x="${cx}" y="${cy-6}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="18" fill="var(--g-dark)">1.2K</text>
    <text x="${cx}" y="${cy+12}" text-anchor="middle" font-family="Inter" font-size="10" fill="var(--g-muted)">pesan</text>
  `;
  const legend = document.getElementById('intentLegend');
  if (legend) legend.innerHTML = data.map(d=>`
    <div class="legend-item">
      <div class="legend-dot" style="background:${d.color}"></div>
      <span>${d.label}</span><span class="legend-pct">${d.pct}%</span>
    </div>`).join('');
}
buildDonut();

/* ── Chart.js volume chart ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('volumeChart');
  if (ctx && window.Chart) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Sen','Sel','Rab','Kam','Jum','Sab','Min'],
        datasets:[{
          label:'Pesan Masuk',
          data:[120,190,150,220,180,250,210],
          borderColor:'#00AA5B',
          backgroundColor:'rgba(0,170,91,0.1)',
          borderWidth:2, tension:0.4, fill:true
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          y:{beginAtZero:true, grid:{color:'rgba(255,255,255,0.05)'}},
          x:{grid:{display:false}}
        }
      }
    });
  }
});

/* ── Card scroll-fade animations ─────────────────────────────── */
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, {threshold:0.1});

document.querySelectorAll('.stat-card,.dash-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = `opacity 0.5s ease ${i*0.05}s, transform 0.5s ease ${i*0.05}s`;
  cardObserver.observe(el);
});

/* ── Initialize first conversation ──────────────────────────── */
setTimeout(() => {
  const firstContact = document.querySelector('.conv-item[data-chat]');
  if (firstContact) firstContact.click();
}, 100);

/* ── Notification bell ───────────────────────────────────────── */
document.getElementById('notifBtn')?.addEventListener('click', () => {
  showToast('📨 3 pesan baru dari pelanggan!', 'green');
});

/* ── Demo mode banner ────────────────────────────────────────── */
if (IS_DEMO) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:9998;
    background:linear-gradient(90deg,#6C47FF,#9b7eff);
    color:#fff;text-align:center;padding:6px 16px;
    font-family:var(--font-jakarta);font-size:13px;font-weight:600;
    display:flex;align-items:center;justify-content:center;gap:8px;
  `;
  banner.innerHTML = `<i class="ti ti-player-play"></i> Mode Demo — Data tidak tersimpan. <a href="login.html" style="color:#fff;text-decoration:underline;margin-left:4px;">Daftar sekarang →</a>`;
  document.body.prepend(banner);
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
loadProfile();
