/* ============================================================
   PROREINIGUNG — Real-time Subscriptions & Notifications UI
   ============================================================ */

const Realtime = (() => {
  let currentUserId    = null;
  let currentUserRole  = null;
  let notifChannel     = null;
  let presenceChannel  = null;
  let chatChannel      = null;

  /* ── Init ─────────────────────────────────────────────────── */
  const init = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    currentUserId = user.id;

    const { data: profile } = await sb.from('profiles')
      .select('role').eq('id', user.id).single();
    currentUserRole = profile?.role || 'client';

    injectBell();
    await loadNotifCount();
    subscribeToNotifications();
    setupPresence();

    if (['team', 'admin'].includes(currentUserRole)) {
      subscribeToChatGlobal();
    }
  };

  /* ── Inject floating notification bell ───────────────────── */
  const injectBell = () => {
    if (document.getElementById('_notif_bell_fab')) return;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      #_notif_bell_fab {
        position: fixed;
        top: 18px;
        right: 24px;
        z-index: 99990;
        display: flex;
        align-items: center;
        gap: 0;
      }
      #_notif_bell_btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0055CC, #003399);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        position: relative;
        box-shadow: 0 6px 24px rgba(0,85,204,.35);
        transition: transform .2s, box-shadow .2s;
      }
      #_notif_bell_btn:hover {
        transform: scale(1.08);
        box-shadow: 0 10px 32px rgba(0,85,204,.45);
      }
      #_notif_bell_btn svg {
        transition: transform .3s;
      }
      #_notif_bell_btn:hover svg {
        transform: rotate(-15deg) scale(1.1);
      }
      #_notif_bell_badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #e53e3e;
        color: #fff;
        font-size: .58rem;
        font-weight: 800;
        border-radius: 999px;
        min-width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        border: 2.5px solid #fff;
        font-family: inherit;
        animation: _bellPop .3s cubic-bezier(.4,0,.2,1);
      }
      @keyframes _bellPop { from{transform:scale(0)} to{transform:scale(1)} }
      #_notif_bell_btn.has-notif svg {
        animation: _bellRing .5s ease;
      }
      @keyframes _bellRing {
        0%,100%{transform:rotate(0)}
        20%{transform:rotate(-20deg)}
        40%{transform:rotate(20deg)}
        60%{transform:rotate(-12deg)}
        80%{transform:rotate(12deg)}
      }
      #_notif_dropdown {
        display: none;
        position: absolute;
        top: calc(100% + 12px);
        right: 0;
        width: 380px;
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,85,204,.1);
        overflow: hidden;
        border: 1px solid rgba(0,85,204,.08);
        animation: _ddOpen .22s cubic-bezier(.4,0,.2,1);
      }
      #_notif_dropdown.open { display: block; }
      @keyframes _ddOpen {
        from { opacity:0; transform:translateY(-10px) scale(.97); }
        to   { opacity:1; transform:translateY(0)    scale(1);    }
      }
      ._nd_header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid #f0f4ff;
        background: linear-gradient(135deg,#f7faff,#eef4ff);
      }
      ._nd_header span {
        font-weight: 800;
        font-size: .92rem;
        color: #1A2035;
        letter-spacing: -.01em;
      }
      ._nd_read_all {
        background: none;
        border: none;
        color: #0055CC;
        font-size: .76rem;
        cursor: pointer;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 999px;
        transition: background .15s;
      }
      ._nd_read_all:hover { background: #e8f0ff; }
      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 13px 20px;
        border-bottom: 1px solid #f5f7ff;
        cursor: pointer;
        transition: background .15s;
      }
      .notif-item:hover { background: #f7faff; }
      .notif-item.unread { background: #EEF5FF; border-left: 3px solid #0055CC; }
      .notif-icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
      .notif-body { flex: 1; min-width: 0; }
      .notif-title { font-weight: 700; font-size: .84rem; color: #1A2035; margin-bottom: 2px; }
      .notif-msg { font-size: .77rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .notif-time { font-size: .68rem; color: #aaa; margin-top: 4px; }
      .notif-dot { width: 9px; height: 9px; border-radius: 50%; background: #0055CC; flex-shrink: 0; margin-top: 7px; }
      .notif-empty { padding: 32px 20px; text-align: center; color: #aaa; font-size: .85rem; }
      .notif-badge { display: none; }
      #notif-list  { max-height: 420px; overflow-y: auto; }
    `;
    document.head.appendChild(style);

    // Create FAB
    const fab = document.createElement('div');
    fab.id = '_notif_bell_fab';
    fab.innerHTML = `
      <button id="_notif_bell_btn" onclick="_toggleNotifDrop()" title="Benachrichtigungen">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span id="_notif_bell_badge" class="notif-badge">0</span>
      </button>
      <div id="_notif_dropdown">
        <div class="_nd_header">
          <span>🔔 Benachrichtigungen</span>
          <button class="_nd_read_all" onclick="Realtime.markAllRead()">Alle gelesen</button>
        </div>
        <div id="notif-list"><div class="notif-empty">Keine Benachrichtigungen</div></div>
      </div>
    `;
    document.body.appendChild(fab);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!fab.contains(e.target)) {
        document.getElementById('_notif_dropdown')?.classList.remove('open');
      }
    });
  };

  window._toggleNotifDrop = () => {
    const dd = document.getElementById('_notif_dropdown');
    const isOpen = dd.classList.toggle('open');
    if (isOpen) refreshNotifDropdown();
  };

  /* ── Notification count badge ─────────────────────────────── */
  const loadNotifCount = async () => {
    if (!currentUserId) return;
    const count = await DB.getUnreadCount(currentUserId);
    updateBadge(count);
  };

  const updateBadge = (count) => {
    // FAB badge
    const fab = document.getElementById('_notif_bell_badge');
    const btn = document.getElementById('_notif_bell_btn');
    if (fab) {
      fab.textContent = count > 9 ? '9+' : count;
      fab.style.display = count > 0 ? 'flex' : 'none';
    }
    if (btn) btn.classList.toggle('has-notif', count > 0);
    // Legacy .notif-badge elements (kept for compatibility)
    document.querySelectorAll('.notif-badge:not(#_notif_bell_badge)').forEach(el => {
      el.textContent = count > 9 ? '9+' : count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  };

  /* ── Subscribe to notifications table ────────────────────── */
  const subscribeToNotifications = () => {
    if (notifChannel) sb.removeChannel(notifChannel);
    notifChannel = sb.channel('notifs:' + currentUserId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, (payload) => {
        showNotifToast(payload.new);
        loadNotifCount();
        refreshNotifDropdown();
      })
      .subscribe();
  };

  /* ── Global chat subscription (ALL team pages) ────────────── */
  // Note: chat notifications now arrive via the `notifications` table (subscribeToNotifications).
  // This subscription is kept as a fallback to bump the nav badge when RLS blocks payload.new.
  const subscribeToChatGlobal = () => {
    if (chatChannel) sb.removeChannel(chatChannel);

    const onChatPage = window.location.pathname.includes('chat.html');

    chatChannel = sb.channel('chat:global:' + currentUserId, {
      config: { broadcast: { self: false } }
    })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_chat'
      }, (payload) => {
        const msg = payload.new;
        // If payload.new is empty (RLS blocked), just bump nav badge as fallback
        if (!msg || !msg.sender_id) {
          if (!onChatPage) bumpChatNavBadge();
          return;
        }
        // Ignore own messages
        if (msg.sender_id === currentUserId) return;
        // Private: ignore if not recipient
        if (msg.is_private && msg.recipient_id !== currentUserId) return;
        // On chat page: handled by chat.html
        if (onChatPage) return;
        // Bump nav badge only — popup is handled by subscribeToNotifications → showNotifToast
        bumpChatNavBadge();
      })
      .subscribe((status) => {
        console.log('[Chat subscription]', status);
      });
  };

  /* ── Chat popup (floating, bottom-right) ─────────────────── */
  const showChatPopup = (senderName, preview, isPrivate) => {
    const old = document.getElementById('_chat_popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = '_chat_popup';
    popup.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px', 'z-index:99999',
      'background:#1A2035', 'color:#fff', 'border-radius:18px',
      'padding:14px 18px', 'max-width:320px', 'width:320px',
      'box-shadow:0 12px 48px rgba(0,0,0,.35)',
      'display:flex', 'align-items:center', 'gap:14px',
      'cursor:pointer', 'font-family:inherit',
      'animation:_slideIn .3s cubic-bezier(.4,0,.2,1)',
      'border:1px solid rgba(255,255,255,.08)'
    ].join(';');

    const typeBg    = isPrivate ? '#FFB703' : '#25D366';
    const typeColor = isPrivate ? '#1A2035' : '#fff';
    const typeLabel = isPrivate ? '🔒 Privat' : '💬 Chat';
    const icon      = isPrivate ? '🔒' : '💬';

    popup.innerHTML = `
      <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#1565C0,#0096b7);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:.9rem;margin-bottom:3px">${escHtml(senderName)}</div>
        <div style="font-size:.77rem;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(preview)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex-shrink:0">
        <span style="background:${typeBg};color:${typeColor};font-size:.65rem;font-weight:800;padding:3px 10px;border-radius:999px">${typeLabel}</span>
        <button id="_chat_popup_close" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:.72rem;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
    `;

    popup.addEventListener('click', (e) => {
      if (e.target.id === '_chat_popup_close') { popup.remove(); return; }
      // Navigate to chat
      const isTeam = window.location.pathname.includes('/team/');
      window.location.href = isTeam ? 'chat.html' : '../team/chat.html';
    });

    document.body.appendChild(popup);

    const timer = setTimeout(() => { if (popup.parentNode) popup.remove(); }, 7000);
    popup.querySelector('#_chat_popup_close').addEventListener('click', () => {
      clearTimeout(timer); popup.remove();
    });
  };

  /* ── Chat nav badge ──────────────────────────────────────── */
  const bumpChatNavBadge = () => {
    const chatLink = document.querySelector('a[href="chat.html"]');
    if (!chatLink) return;

    let badge = chatLink.querySelector('._chat_badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = '_chat_badge';
      badge.style.cssText = 'background:#e53e3e;color:#fff;margin-left:auto;min-width:18px;height:18px;font-size:.62rem;font-weight:800;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px';
      chatLink.appendChild(badge);
    }
    const n = (parseInt(badge.textContent) || 0) + 1;
    badge.textContent = n;
    chatLink.addEventListener('click', () => badge.remove(), { once: true });
  };

  /* ── Notification toast ──────────────────────────────────── */
  const showNotifToast = (notif) => {
    const isChatType = ['chat_group', 'chat_private', 'private_message'].includes(notif.type);
    if (isChatType) {
      const onChatPage = window.location.pathname.includes('chat.html');
      if (!onChatPage) {
        const isPrivate = notif.type === 'chat_private' || notif.type === 'private_message';
        const senderName = (notif.title || '').replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\uD83C-\uDBFF\uDC00-\uDFFF]\s*/u, '').trim() || 'Teammitglied';
        playNotifSound();
        showChatPopup(senderName, notif.message || '', isPrivate);
        bumpChatNavBadge();
      }
      return;
    }
    playNotifSound();
    // Show a contextual toast based on type
    if (typeof proToast === 'function') {
      proToast(notif.title || 'Neue Benachrichtigung', 'info');
    } else if (typeof showToast === 'function') {
      showToast(notif.title, notif.message, 'info');
    }
    // Refresh nav badges
    if (typeof proLoadNotifications === 'function' && currentUserId) {
      proLoadNotifications(currentUserId);
    }
  };

  /* ── Sound ────────────────────────────────────────────────── */
  const playNotifSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.35, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
      setTimeout(() => ctx.close(), 600);
    } catch(e) {}
  };

  /* ── Notification dropdown ────────────────────────────────── */
  const refreshNotifDropdown = async () => {
    const list = document.getElementById('notif-list');
    if (!list || !currentUserId) return;
    const notifs = await DB.getNotifications(currentUserId, 20);
    if (!notifs.length) {
      list.innerHTML = `<div class="notif-empty">🔕 Keine Benachrichtigungen</div>`;
      return;
    }
    list.innerHTML = notifs.map(n => {
      const isChatGroup   = n.type === 'chat_group';
      const isChatPrivate = n.type === 'chat_private' || n.type === 'private_message';
      const isChat = isChatGroup || isChatPrivate;

      const chatBadge = isChat ? `
        <span style="
          display:inline-flex;align-items:center;gap:3px;
          padding:2px 8px;border-radius:999px;
          font-size:.63rem;font-weight:800;
          background:${isChatPrivate ? '#FFF3CD' : '#E6F9F2'};
          color:${isChatPrivate ? '#856404' : '#0D9F6E'};
          margin-top:5px;
        ">${isChatPrivate ? '🔒 Privat' : '💬 Gruppe'}</span>
      ` : '';

      return `
      <div class="notif-item ${n.read ? '' : 'unread'}"
           onclick="Realtime.openNotif('${n.id}','${n.order_id || ''}','${n.type || ''}')"
           style="cursor:pointer">
        <span class="notif-icon">${getNotifIcon(n.type)}</span>
        <div class="notif-body">
          <div class="notif-title">${escHtml(n.title)}</div>
          <div class="notif-msg">${escHtml(n.message)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div class="notif-time">${timeAgo(n.created_at)}</div>
            ${chatBadge}
          </div>
        </div>
        ${!n.read ? '<span class="notif-dot"></span>' : ''}
      </div>`;
    }).join('');
  };

  const openNotif = async (notifId, orderId, notifType) => {
    await DB.markNotifRead(notifId);
    loadNotifCount();
    refreshNotifDropdown();
    document.getElementById('_notif_dropdown')?.classList.remove('open');

    const path = window.location.pathname;
    const isTeam = path.includes('/team/');
    const onChat = path.includes('chat.html');

    if (isTeam || onChat) {
      if (notifType === 'chat_group') {
        window.location.href = 'chat.html?tab=group';
      } else if (notifType === 'chat_private' || notifType === 'private_message') {
        window.location.href = 'chat.html?tab=priv';
      } else if (notifType === 'new_contact') {
        // Contact form message → go to Nachrichten
        window.location.href = 'nachrichten.html';
      } else if (notifType === 'new_application') {
        // New job application → go to Kandidaturen
        window.location.href = 'kandidaturen.html';
      } else if (notifType === 'new_order' || notifType === 'new_guest' || notifType === 'order_update') {
        // New order or guest request or order update → go to Aufträge
        if (orderId && orderId !== 'null' && orderId !== 'undefined') {
          window.location.href = `orders.html?order=${orderId}`;
        } else {
          window.location.href = 'orders.html';
        }
      } else if (notifType === 'new_message') {
        // Order message → go to Aufträge (with order open if available)
        if (orderId && orderId !== 'null' && orderId !== 'undefined') {
          window.location.href = `orders.html?order=${orderId}`;
        } else {
          window.location.href = 'orders.html';
        }
      } else if (notifType === 'invoice') {
        window.location.href = 'umsatz.html';
      } else if (orderId && orderId !== 'null' && orderId !== 'undefined') {
        window.location.href = `orders.html?order=${orderId}`;
      }
    } else {
      // Client portal
      if (notifType === 'invoice') {
        if (typeof activateTabDirect === 'function') activateTabDirect('invoices');
        else window.location.hash = '#invoices';
      } else if (notifType === 'new_message' || notifType === 'message' || notifType === 'order_update') {
        if (typeof activateTabDirect === 'function') activateTabDirect('orders');
        else window.location.hash = '#orders';
        if (orderId && orderId !== 'null' && orderId !== 'undefined') {
          setTimeout(() => { if (typeof openOrderDetail === 'function') openOrderDetail(orderId); }, 200);
        }
      } else if (orderId && orderId !== 'null' && orderId !== 'undefined') {
        if (typeof activateTabDirect === 'function') {
          activateTabDirect('orders');
          setTimeout(() => { if (typeof openOrderDetail === 'function') openOrderDetail(orderId); }, 200);
        } else {
          window.location.href = `dashboard.html#orders`;
        }
      }
    }
  };

  const markAllRead = async () => {
    if (!currentUserId) return;
    await DB.markAllNotifsRead(currentUserId);
    updateBadge(0);
    refreshNotifDropdown();
  };

  /* ── Presence ─────────────────────────────────────────────── */
  const setupPresence = () => {
    presenceChannel = sb.channel('presence:global', {
      config: { presence: { key: currentUserId } }
    });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        updateOnlineUsers(Object.keys(state));
      })
      .on('presence', { event: 'join' }, ({ key }) => addOnlineUser(key))
      .on('presence', { event: 'leave' }, ({ key }) => removeOnlineUser(key))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
          await sb.from('profiles')
            .update({ is_online: true, last_seen: new Date().toISOString() })
            .eq('id', currentUserId);
        }
      });
    window.addEventListener('beforeunload', () => {
      sb.from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', currentUserId);
    });
  };

  const updateOnlineUsers = (userIds) => {
    document.querySelectorAll('[data-online-uid]').forEach(el => {
      el.classList.toggle('is-online', userIds.includes(el.getAttribute('data-online-uid')));
    });
    const countEl = document.getElementById('online-count');
    if (countEl) countEl.textContent = userIds.length;
  };
  const addOnlineUser    = (uid) => document.querySelectorAll(`[data-online-uid="${uid}"]`).forEach(el => el.classList.add('is-online'));
  const removeOnlineUser = (uid) => document.querySelectorAll(`[data-online-uid="${uid}"]`).forEach(el => el.classList.remove('is-online'));

  /* ── Subscriptions used directly in pages ─────────────────── */
  const subscribeToChat = (onMessage) => {
    return sb.channel('chat_page_sub:' + currentUserId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat' },
        (payload) => onMessage(payload.new))
      .subscribe();
  };

  const subscribeToOrders = (onChange) => {
    return sb.channel('orders_sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
        (payload) => onChange(payload))
      .subscribe();
  };

  const subscribeToOrderMessages = (orderId, onMessage) => {
    return sb.channel('ordmsgs:' + orderId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'order_messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => onMessage(payload.new))
      .subscribe();
  };

  /* ── Helpers ──────────────────────────────────────────────── */
  const getNotifIcon = (type) => {
    const m = {
      new_order:'🔔', order_update:'📋', new_message:'💬', invoice:'🧾',
      private_message:'🔒', chat_private:'🔒', chat_group:'💬',
      new_contact:'✉️', new_guest:'📩', new_application:'📋',
      info:'ℹ️', chat:'💬'
    };
    return m[type] || '🔔';
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `vor ${hrs} Std.`;
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const escHtml = (t) =>
    String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return {
    init, loadNotifCount, updateBadge, refreshNotifDropdown,
    openNotif, markAllRead,
    subscribeToChat, subscribeToOrders, subscribeToOrderMessages,
    updateOnlineUsers, timeAgo, playNotifSound
  };
})();

window.Realtime = Realtime;

// Keyframes
const _rstyle = document.createElement('style');
_rstyle.textContent = `
  @keyframes _slideIn { from { transform:translateX(120%); opacity:0 } to { transform:translateX(0); opacity:1 } }
  @keyframes _pulse   { from { transform:scale(1) } to { transform:scale(1.15) } }
`;
document.head.appendChild(_rstyle);

document.addEventListener('DOMContentLoaded', () => Realtime.init());
