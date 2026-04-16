/* ============================================================
   PROREINIGUNG — Dashboard JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  const user     = Auth.current();
  const fullUser = Auth.getFullUser(user.id);
  const orders   = fullUser ? fullUser.orders : [];

  /* ── Fill user info ───────────────────────────────────────── */
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = `${user.vorname} ${user.nachname}`;
  });
  document.querySelectorAll('[data-user-first]').forEach(el => {
    el.textContent = user.vorname;
  });
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = user.email;
  });
  document.querySelectorAll('[data-user-initials]').forEach(el => {
    el.textContent = (user.vorname[0] + user.nachname[0]).toUpperCase();
  });

  /* ── Stats cards ──────────────────────────────────────────── */
  const active   = orders.filter(o => o.status === 'Aktiv').length;
  const done     = orders.filter(o => o.status === 'Abgeschlossen').length;
  const pending  = orders.filter(o => o.status === 'Ausstehend').length;
  const invoices = orders.filter(o => o.invoice).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-orders',   orders.length);
  set('stat-active',   active);
  set('stat-done',     done);
  set('stat-invoices', invoices);

  /* ── Orders table ─────────────────────────────────────────── */
  const ordersBody = document.getElementById('orders-tbody');
  if (ordersBody) {
    ordersBody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.service}</td>
        <td>${o.adresse}</td>
        <td>${new Date(o.datum).toLocaleDateString('de-DE')}</td>
        <td>${o.preis || '—'}</td>
        <td><span class="status-badge ${statusClass(o.status)}">${o.status}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="openOrderDetail('${o.id}')">Details</button>
            ${o.status !== 'Abgeschlossen' && o.status !== 'Storniert'
              ? `<button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border-radius:999px" onclick="cancelOrder('${o.id}')">Stornieren</button>`
              : ''}
          </div>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-light)">Noch keine Aufträge vorhanden.</td></tr>`;
  }

  /* ── Invoices table ───────────────────────────────────────── */
  const invoicesBody = document.getElementById('invoices-tbody');
  if (invoicesBody) {
    const invOrders = orders.filter(o => o.invoice);
    invoicesBody.innerHTML = invOrders.length ? invOrders.map(o => `
      <tr>
        <td><strong>${o.invoice.nr}</strong></td>
        <td>${o.service}</td>
        <td>${new Date(o.invoice.datum).toLocaleDateString('de-DE')}</td>
        <td><strong>${o.invoice.betrag}</strong></td>
        <td><span class="status-badge ${o.invoice.status === 'Bezahlt' ? 'badge-done' : 'badge-pending'}">${o.invoice.status}</span></td>
        <td><button class="btn btn-sm btn-outline" onclick="downloadInvoice('${o.invoice.nr}')">📄 Herunterladen</button></td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">Keine Rechnungen vorhanden.</td></tr>`;
  }

  /* ── Recent messages ──────────────────────────────────────── */
  const msgList = document.getElementById('messages-list');
  if (msgList) {
    const allMessages = [];
    orders.forEach(o => {
      (o.messages || []).forEach(m => allMessages.push({ ...m, orderId: o.id, service: o.service }));
    });
    allMessages.sort((a, b) => new Date(b.date) - new Date(a.date));

    msgList.innerHTML = allMessages.length ? allMessages.slice(0, 5).map(m => `
      <div class="msg-item" style="display:flex;gap:14px;padding:16px;background:var(--light);border-radius:12px;border:1px solid var(--gray-200)">
        <div style="width:42px;height:42px;min-width:42px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.9rem">🛡️</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <strong style="font-size:.9rem;color:var(--primary-dark)">Team Proreinigung</strong>
            <span style="font-size:.75rem;color:var(--text-light)">${new Date(m.date).toLocaleDateString('de-DE')}</span>
          </div>
          <p style="font-size:.87rem;color:var(--text-light)">${m.text}</p>
          <span style="font-size:.75rem;color:var(--secondary);font-weight:600">Auftrag: ${m.orderId}</span>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;padding:40px;color:var(--text-light);font-size:.9rem">Keine Nachrichten vorhanden.</div>`;
  }

  /* ── Profile form ─────────────────────────────────────────── */
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.querySelector('#pf-vorname').value = user.vorname || '';
    profileForm.querySelector('#pf-nachname').value = user.nachname || '';
    profileForm.querySelector('#pf-email').value = user.email || '';
    profileForm.querySelector('#pf-telefon').value = user.telefon || '';

    profileForm.addEventListener('submit', e => {
      e.preventDefault();
      const res = Auth.updateProfile(user.id, {
        vorname:  profileForm.querySelector('#pf-vorname').value,
        nachname: profileForm.querySelector('#pf-nachname').value,
        telefon:  profileForm.querySelector('#pf-telefon').value,
      });
      if (res.ok) showToast('Gespeichert', 'Ihre Daten wurden aktualisiert.', 'success');
      else showToast('Fehler', res.msg, 'error');
    });
  }

  /* ── Password form ────────────────────────────────────────── */
  const pwForm = document.getElementById('password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', e => {
      e.preventDefault();
      const oldPw  = pwForm.querySelector('#pw-old').value;
      const newPw  = pwForm.querySelector('#pw-new').value;
      const confPw = pwForm.querySelector('#pw-confirm').value;
      if (newPw !== confPw) return showToast('Fehler', 'Passwörter stimmen nicht überein.', 'error');
      if (newPw.length < 6) return showToast('Fehler', 'Passwort muss mindestens 6 Zeichen haben.', 'error');
      const res = Auth.changePassword(user.id, oldPw, newPw);
      if (res.ok) { showToast('Aktualisiert', 'Passwort wurde geändert.', 'success'); pwForm.reset(); }
      else showToast('Fehler', res.msg, 'error');
    });
  }

  /* ── Tab navigation ───────────────────────────────────────── */
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabPanels    = document.querySelectorAll('.tab-panel');

  const activateTab = (tabId) => {
    sidebarLinks.forEach(l => l.classList.toggle('active', l.dataset.tab === tabId));
    tabPanels.forEach(p => p.style.display = p.id === tabId ? 'block' : 'none');
    const title = document.getElementById('dash-page-title');
    const activeLink = document.querySelector(`.sidebar-link[data-tab="${tabId}"]`);
    if (title && activeLink) title.textContent = activeLink.querySelector('span')?.textContent || '';
  };

  sidebarLinks.forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    activateTab(l.dataset.tab);
    history.replaceState(null, '', `#${l.dataset.tab}`);
  }));

  const hash = location.hash.slice(1) || 'overview';
  activateTab(hash);

  /* ── Global order actions ─────────────────────────────────── */
  window.cancelOrder = (orderId) => {
    if (!confirm('Möchten Sie diesen Auftrag wirklich stornieren?')) return;
    const res = Auth.cancelOrder(user.id, orderId);
    if (res.ok) { showToast('Storniert', 'Auftrag wurde erfolgreich storniert.', 'success'); setTimeout(() => location.reload(), 1200); }
    else showToast('Fehler', res.msg || 'Fehler beim Stornieren.', 'error');
  };

  window.openOrderDetail = (orderId) => {
    const o = orders.find(x => x.id === orderId);
    if (!o) return;
    const modal = document.getElementById('order-modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = `Auftrag ${o.id}`;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-detail-grid">
        <div><strong>Service:</strong> ${o.service}</div>
        <div><strong>Status:</strong> <span class="status-badge ${statusClass(o.status)}">${o.status}</span></div>
        <div><strong>Adresse:</strong> ${o.adresse}</div>
        <div><strong>Termin:</strong> ${new Date(o.datum).toLocaleDateString('de-DE')}</div>
        <div><strong>Fläche:</strong> ${o.flaeche || '—'}</div>
        <div><strong>Betrag:</strong> ${o.preis || 'Auf Anfrage'}</div>
      </div>
      ${o.invoice ? `<div style="margin-top:20px;padding:16px;background:var(--light);border-radius:12px;border:1px solid var(--gray-200)">
        <strong>Rechnung ${o.invoice.nr}</strong> — ${o.invoice.betrag}
        <span class="status-badge ${o.invoice.status === 'Bezahlt' ? 'badge-done' : 'badge-pending'}" style="margin-left:10px">${o.invoice.status}</span>
      </div>` : ''}
      <h4 style="margin:20px 0 12px;font-size:1rem">Nachrichten vom Team:</h4>
      ${o.messages && o.messages.length
        ? o.messages.map(m => `<div style="background:#f0f8ff;border-left:3px solid var(--secondary);padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:8px;font-size:.88rem;color:var(--text)">
          <strong>Team:</strong> ${m.text} <em style="color:var(--text-light);font-size:.78rem">— ${new Date(m.date).toLocaleDateString('de-DE')}</em></div>`).join('')
        : '<p style="color:var(--text-light);font-size:.88rem">Keine Nachrichten.</p>'}
    `;
    modal.style.display = 'flex';
  };

  window.closeModal = () => {
    document.getElementById('order-modal').style.display = 'none';
  };

  window.downloadInvoice = (nr) => {
    showToast('Rechnung', `Rechnung ${nr} wird vorbereitet…`, 'info');
  };

  window.logoutUser = () => Auth.logout();

  /* ── Status class helper ──────────────────────────────────── */
  function statusClass(status) {
    const map = { 'Ausstehend': 'badge-pending', 'Aktiv': 'badge-active', 'Abgeschlossen': 'badge-done', 'Storniert': 'badge-cancelled' };
    return map[status] || 'badge-pending';
  }
});
