/* ============================================================
   PROREINIGUNG — Pro Layout Shared JS
   ============================================================ */

/* ── Helpers ─────────────────────────────────────────────────── */
function escHtml(t) {
  return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getInitials(v,n) { return ((v||'')[0]+(n||'')[0]).toUpperCase() || '?'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'});
}
function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  return fmtDate(d);
}
function statusBadge(s) {
  const map = {
    Neu:'pb-neu', Ausstehend:'pb-ausstehend',
    Aktiv:'pb-aktiv', Bearbeitung:'pb-bearbeitung',
    Abgeschlossen:'pb-done', Erledigt:'pb-done', Bezahlt:'pb-done', Beantwortet:'pb-beantwortet',
    Storniert:'pb-cancel', Abgelehnt:'pb-abgelehnt', Überfällig:'pb-ueberfaellig',
    Pending:'pb-pending', Offen:'pb-warn',
  };
  return `<span class="pro-badge ${map[s]||'pb-info'}">${escHtml(s||'—')}</span>`;
}

/* ── Toast ───────────────────────────────────────────────────── */
function proToast(msg, type = 'info') {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  const container = document.getElementById('pro-toasts');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `pro-toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i><span>${escHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
window.proToast = proToast;

/* ── Sidebar init ────────────────────────────────────────────── */
function proInitSidebar(profile) {
  const inits = getInitials(profile.vorname, profile.nachname);
  const name  = `${profile.vorname} ${profile.nachname}`;
  const role  = profile.role === 'admin' ? 'Administrator' : 'Teammitglied';

  // Sidebar user
  const av   = document.getElementById('pro-sb-av');
  const uname = document.getElementById('pro-sb-name');
  const urole = document.getElementById('pro-sb-role');
  if (av) {
    if (profile.avatar_url) av.innerHTML = `<img src="${profile.avatar_url}" alt="">`;
    else av.textContent = inits;
  }
  if (uname) uname.textContent = name;
  if (urole) urole.textContent = role;

  // Topbar user
  const tav   = document.getElementById('pro-topbar-av');
  const tname = document.getElementById('pro-topbar-name');
  const trole = document.getElementById('pro-topbar-role');
  if (tav) {
    if (profile.avatar_url) tav.innerHTML = `<img src="${profile.avatar_url}" alt="">`;
    else tav.textContent = inits;
  }
  if (tname) tname.textContent = name;
  if (trole) trole.textContent = role;

  // Mobile avatar
  const mav = document.getElementById('pro-mob-av');
  if (mav) {
    if (profile.avatar_url) mav.innerHTML = `<img src="${profile.avatar_url}" alt="">`;
    else mav.textContent = inits;
  }

  // Admin links
  if (profile.role === 'admin') {
    document.querySelectorAll('.pro-admin-only').forEach(el => {
      el.style.display = el.classList.contains('pro-admin-block') ? 'block' : 'flex';
    });
  }

  // Logout
  document.querySelectorAll('.pro-logout-btn').forEach(btn => {
    btn.addEventListener('click', async () => { await Auth.logout(); });
  });
}
window.proInitSidebar = proInitSidebar;

/* ── Mobile sidebar toggle ───────────────────────────────────── */
function proInitMobileSidebar() {
  const sidebar  = document.getElementById('pro-sidebar');
  const overlay  = document.getElementById('pro-overlay');
  const menuBtn  = document.getElementById('pro-mob-menu');

  const open  = () => { sidebar?.classList.add('open'); overlay?.classList.add('open'); document.body.style.overflow='hidden'; };
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); document.body.style.overflow=''; };

  menuBtn?.addEventListener('click', open);
  overlay?.addEventListener('click', close);

  // Swipe
  let tx = 0;
  document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive:true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (dx < -60 && sidebar?.classList.contains('open')) close();
    if (dx > 60 && tx < 30) open();
  }, { passive:true });

  // Close on nav link click (mobile)
  document.querySelectorAll('.pro-sb-link').forEach(l => {
    l.addEventListener('click', () => { if (window.innerWidth <= 900) close(); });
  });
}
window.proInitMobileSidebar = proInitMobileSidebar;

/* ── Notification popover ────────────────────────────────────── */
async function proLoadNotifications(userId) {
  const notifs = await DB.getNotifications(userId, 25);
  const unread = notifs.filter(n => !n.read).length;

  // Nachrichten badge — ONLY real contact form messages
  const contactUnread = notifs.filter(n => !n.read && n.type === 'new_contact').length;

  // Aufträge badge — new orders, order updates, guest requests, order messages
  const orderUnread = notifs.filter(n => !n.read && ['new_order','order_update','new_guest','new_message'].includes(n.type)).length;

  // Bewerbungen badge — new applications
  const appUnread = notifs.filter(n => !n.read && n.type === 'new_application').length;

  // Chat badge — team chat notifications
  const chatUnread = notifs.filter(n => !n.read && ['chat_group','chat_private','private_message'].includes(n.type)).length;

  // Bell badges — all notifications
  document.querySelectorAll('.pro-notif-count').forEach(el => {
    if (unread > 0) { el.textContent = unread > 99 ? '99+' : unread; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });

  // Nachrichten badge — contact messages only
  document.querySelectorAll('.pro-contact-count').forEach(el => {
    if (contactUnread > 0) { el.textContent = contactUnread > 99 ? '99+' : contactUnread; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });

  // Aufträge badge — orders & related
  document.querySelectorAll('.pro-new-orders-badge').forEach(el => {
    if (orderUnread > 0) { el.textContent = orderUnread > 99 ? '99+' : orderUnread; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });

  // Bewerbungen badge
  document.querySelectorAll('.pro-app-count').forEach(el => {
    if (appUnread > 0) { el.textContent = appUnread > 99 ? '99+' : appUnread; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });

  // Chat badge
  document.querySelectorAll('.pro-chat-count').forEach(el => {
    if (chatUnread > 0) { el.textContent = chatUnread > 99 ? '99+' : chatUnread; el.style.display = 'flex'; }
    else el.style.display = 'none';
  });

  const list = document.getElementById('pro-notif-list');
  if (!list) return;

  if (!notifs.length) {
    list.innerHTML = '<div class="pro-notif-empty">Keine Benachrichtigungen</div>';
    return;
  }

  const icons = { new_order:'📋', order_update:'🔄', new_message:'💬', chat_private:'🔒', chat_group:'💬', invoice:'🧾', new_contact:'✉️', new_guest:'📩', new_application:'📋' };
  const html = notifs.slice(0, 15).map(n => `
    <div class="pro-notif-row ${n.read ? '' : 'unread'}" onclick="proMarkRead('${n.id}','${n.order_id||''}','${userId}')">
      <span class="pro-notif-ic">${icons[n.type] || '🔔'}</span>
      <div class="pro-notif-bd">
        <div class="pro-notif-title">${escHtml(n.title)}</div>
        <div class="pro-notif-msg">${escHtml(n.message)}</div>
        <div class="pro-notif-time">${timeAgo(n.created_at)}</div>
      </div>
      ${!n.read ? '<div class="pro-notif-dot"></div>' : ''}
    </div>`).join('');
  list.innerHTML = html;
  // Sync to mobile popover too
  const mobList = document.getElementById('pro-notif-list-mob');
  if (mobList) mobList.innerHTML = html;
}
window.proLoadNotifications = proLoadNotifications;

window.proMarkRead = async (id, orderId, userId) => {
  await DB.markNotifRead(id);
  if (orderId) window.location.href = `orders.html?id=${orderId}`;
  else proLoadNotifications(userId);
};

window.proMarkAllRead = async (userId) => {
  await DB.markAllNotifsRead(userId);
  proLoadNotifications(userId);
  proToast('Alle als gelesen markiert', 'success');
};

/* ── Notification popover toggle ─────────────────────────────── */
function proInitNotifPopover() {
  const pop = document.getElementById('pro-notif-pop');

  // On mobile, the popover is inside the hidden topbar.
  // Create a mobile-friendly notification panel outside any hidden container.
  let mobilePop = document.getElementById('pro-notif-pop-mobile');
  if (!mobilePop) {
    mobilePop = document.createElement('div');
    mobilePop.id = 'pro-notif-pop-mobile';
    mobilePop.className = 'pro-notif-pop';
    mobilePop.style.cssText = 'position:fixed;top:calc(var(--mob-h) + 6px);left:8px;right:8px;width:auto;max-width:400px;margin:0 auto;z-index:9999;display:none;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18)';
    mobilePop.innerHTML = `
      <div class="pro-notif-hd"><h4>Benachrichtigungen</h4><button onclick="proMarkAllRead(window._proUserId)">Alle gelesen</button></div>
      <div id="pro-notif-list-mob" style="max-height:60vh;overflow-y:auto"><div class="pro-notif-empty">Keine Meldungen</div></div>`;
    document.body.appendChild(mobilePop);
  }

  // Handle ALL bell buttons (mobile header + desktop topbar)
  document.querySelectorAll('#pro-notif-btn, .pro-icon-btn').forEach(btn => {
    if (!btn.querySelector('.fa-bell')) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        // Copy content from desktop popover to mobile if available
        const desktopList = document.getElementById('pro-notif-list');
        const mobileList = document.getElementById('pro-notif-list-mob');
        if (desktopList && mobileList) mobileList.innerHTML = desktopList.innerHTML;
        mobilePop.style.display = mobilePop.style.display === 'block' ? 'none' : 'block';
        if (pop) pop.classList.remove('open');
      } else {
        pop?.classList.toggle('open');
        mobilePop.style.display = 'none';
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#pro-notif-pop-mobile') && !e.target.closest('#pro-notif-btn') && !e.target.closest('.pro-icon-btn')) {
      pop?.classList.remove('open');
      mobilePop.style.display = 'none';
    }
  });
}
window.proInitNotifPopover = proInitNotifPopover;

/* ── PWA ─────────────────────────────────────────────────────── */
function proInitPWA() {
  let deferredPrompt;
  const banner = document.querySelector('.pro-pwa');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    setTimeout(() => banner?.classList.add('visible'), 5000);
  });
  document.querySelector('.pro-pwa-install')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner?.classList.remove('visible');
  });
  document.querySelector('.pro-pwa-close')?.addEventListener('click', () => banner?.classList.remove('visible'));
  window.addEventListener('appinstalled', () => { banner?.classList.remove('visible'); });
}
window.proInitPWA = proInitPWA;

/* ── Service Worker ──────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js').catch(() => {});
  });
}

/* ── Team Presence ───────────────────────────────────────────── */
let _presenceCh = null;
async function proInitPresence(userId, profile) {
  _presenceCh = sb.channel('team-presence', { config: { presence: { key: userId } } });

  const dispatchPresenceUpdate = () => {
    try {
      const state = _presenceCh.presenceState();
      const allMembers = Object.values(state).flat();
      // Deduplicate by user_id — multiple tabs or channels can create duplicate entries
      const seen = new Set();
      const members = allMembers.filter(m => {
        const key = m.user_id || m.name;
        if (!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
      window.dispatchEvent(new CustomEvent('team-presence-update', { detail: members }));
    } catch(e) {}
  };

  _presenceCh
    .on('presence', { event: 'sync' }, dispatchPresenceUpdate)
    .on('presence', { event: 'join' }, dispatchPresenceUpdate)
    .on('presence', { event: 'leave' }, dispatchPresenceUpdate)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await _presenceCh.track({
          user_id: userId,
          name: `${profile.vorname} ${profile.nachname}`,
          role: profile.role,
          avatar_url: profile.avatar_url || null
        });
        setTimeout(dispatchPresenceUpdate, 500);
      }
    });
  return _presenceCh;
}
window.proInitPresence = proInitPresence;
window.getPresenceChannel = () => _presenceCh;

/* ── Full page init (call from each page) ─────────────────────── */
async function proPageInit(activePage) {
  const auth = await Auth.requireTeam();
  if (!auth) return null;

  window._proUserId = auth.user.id;
  proInitSidebar(auth.profile);
  proInitMobileSidebar();
  proInitNotifPopover();
  proInitPWA();
  proLoadNotifications(auth.user.id);
  proInitPresence(auth.user.id, auth.profile);

  // Active sidebar link
  document.querySelectorAll('.pro-sb-link').forEach(l => {
    if (l.getAttribute('href') === activePage) l.classList.add('active');
  });
  // Active bottom nav
  document.querySelectorAll('.pro-bot-item').forEach(l => {
    if (l.getAttribute('href') === activePage) l.classList.add('active');
  });

  // Realtime notifications
  sb.channel(`notifs-${auth.user.id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${auth.user.id}`
    }, () => {
      proLoadNotifications(auth.user.id);
      proToast('Neue Benachrichtigung', 'info');
    })
    .subscribe();

  // Remove loading
  document.getElementById('pro-loading')?.remove();

  return auth;
}
window.proPageInit = proPageInit;

/* ── Shared sound ────────────────────────────────────────────── */
function proPlaySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 554, 660].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
    setTimeout(() => ctx.close(), 800);
  } catch(e) {}
}
window.proPlaySound = proPlaySound;
