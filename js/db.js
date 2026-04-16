/* ============================================================
   PROREINIGUNG — Database Operations
   ============================================================ */

const DB = (() => {

  /* ═══ ORDERS ════════════════════════════════════════════════ */

  const createOrder = async (orderData) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false };
    const { data, error } = await sb.from('orders').insert({ client_id: user.id, ...orderData }).select().single();
    if (error) return { ok: false, msg: error.message };
    const { data: team } = await sb.from('profiles').select('id').in('role', ['team', 'admin']);
    if (team) {
      await sb.from('notifications').insert(team.map(m => ({
        user_id: m.id, type: 'new_order', title: '🔔 Neue Bestellung',
        message: `Neue Bestellung: ${data.service} — ${data.adresse || ''}`, order_id: data.id
      })));
    }
    await Auth.logActivity(user.id, 'create_order', `Bestellung ${data.order_number}`);
    return { ok: true, order: data };
  };

  const getOrders = async (filters = {}) => {
    let q = sb.from('orders').select(`*,
      client:profiles!orders_client_id_fkey(id,vorname,nachname,email,telefon),
      assigned:profiles!orders_assigned_to_fkey(id,vorname,nachname,avatar_url)
    `).order('created_at', { ascending: false });
    if (filters.clientId)   q = q.eq('client_id', filters.clientId);
    if (filters.status)     q = q.eq('status', filters.status);
    if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
    const { data, error } = await q;
    return error ? [] : data;
  };

  const getOrder = async (id) => {
    const { data } = await sb.from('orders').select(`*,
      client:profiles!orders_client_id_fkey(id,vorname,nachname,email,telefon,adresse),
      assigned:profiles!orders_assigned_to_fkey(id,vorname,nachname,avatar_url)
    `).eq('id', id).single();
    return data;
  };

  const updateOrder = async (id, updates) => {
    const { data, error } = await sb.from('orders').update(updates).eq('id', id).select().single();
    if (error) return { ok: false, msg: error.message };
    if (data.client_id && updates.status) {
      const labels = { Aktiv:'✅ Ihr Auftrag wurde angenommen!', Abgeschlossen:'🏆 Ihr Auftrag wurde abgeschlossen!', Storniert:'❌ Ihr Auftrag wurde storniert.' };
      await sb.from('notifications').insert({
        user_id: data.client_id, type: 'order_update', title: '📋 Auftrag aktualisiert',
        message: labels[updates.status] || `Auftrag ${data.order_number} aktualisiert.`, order_id: id
      });
    }
    const { data: { user } } = await sb.auth.getUser();
    if (user) await Auth.logActivity(user.id, 'update_order', `${data.order_number}: ${JSON.stringify(updates)}`);
    return { ok: true, order: data };
  };

  const assignOrder  = async (orderId, uid) => updateOrder(orderId, { assigned_to: uid, status: 'Aktiv' });
  const cancelOrder  = async (orderId) => updateOrder(orderId, { status: 'Storniert' });

  const setOrderPrice = async (orderId, price) => {
    const { data, error } = await sb.from('orders').update({ preis_agreed: price }).eq('id', orderId).select().single();
    if (error) return { ok: false, msg: error.message };
    if (data.client_id) {
      await sb.from('notifications').insert({
        user_id: data.client_id, type: 'order_update', title: '💰 Preis vereinbart',
        message: `Für Auftrag ${data.order_number}: Preis € ${price} festgelegt.`, order_id: orderId
      });
    }
    return { ok: true, order: data };
  };

  /* ═══ ORDER MESSAGES ════════════════════════════════════════ */

  const getOrderMessages = async (orderId) => {
    const { data } = await sb.from('order_messages').select(`*,
      sender:profiles!order_messages_sender_id_fkey(id,vorname,nachname,role,avatar_url)
    `).eq('order_id', orderId).order('created_at', { ascending: true });
    return data || [];
  };

  const sendOrderMessage = async (orderId, message) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false };
    const profile = await Auth.getProfile(user.id);
    const { data, error } = await sb.from('order_messages').insert({
      order_id: orderId, sender_id: user.id, sender_role: profile?.role || 'client', message
    }).select().single();
    if (error) return { ok: false };
    const order = await getOrder(orderId);
    if (order) {
      const isTeam = ['team','admin'].includes(profile?.role);
      if (isTeam && order.client_id) {
        await sb.from('notifications').insert({
          user_id: order.client_id, type: 'new_message', title: '💬 Neue Nachricht',
          message: `Team antwortet auf Auftrag ${order.order_number}`, order_id: orderId
        });
      }
      if (!isTeam) {
        // Notify assigned member if exists, otherwise notify all admins
        if (order.assigned_to) {
          await sb.from('notifications').insert({
            user_id: order.assigned_to, type: 'new_message', title: '💬 Nachricht vom Kunden',
            message: `Auftrag ${order.order_number}: Neue Nachricht`, order_id: orderId
          });
        } else {
          const { data: admins } = await sb.from('profiles').select('id').in('role', ['team','admin']);
          if (admins?.length) {
            await sb.from('notifications').insert(admins.map(a => ({
              user_id: a.id, type: 'new_message', title: '💬 Nachricht vom Kunden',
              message: `Auftrag ${order.order_number}: Neue Nachricht`, order_id: orderId
            })));
          }
        }
      }
    }
    return { ok: true, message: data };
  };

  /* ═══ NOTIFICATIONS ════════════════════════════════════════ */

  const getNotifications  = async (userId, limit = 20) => {
    const { data } = await sb.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  };
  const getUnreadCount    = async (userId) => {
    const { count } = await sb.from('notifications').select('*', { count:'exact', head:true })
      .eq('user_id', userId).eq('read', false);
    return count || 0;
  };
  const markNotifRead     = async (id) => sb.from('notifications').update({ read: true }).eq('id', id);
  const markAllNotifsRead = async (uid) => sb.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);

  /* ═══ TEAM CHAT ══════════════════════════════════════════ */

  const getChatMessages = async (limit = 60) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('team_chat').select(`*,
      sender:profiles!team_chat_sender_id_fkey(id,vorname,nachname,avatar_url,role),
      recipient:profiles!team_chat_recipient_id_fkey(id,vorname,nachname)
    `)
    .or(`is_private.eq.false,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false }).limit(limit);
    return (data || []).reverse();
  };

  const sendChatMessage = async (message, recipientId = null, fileData = null) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false };
    const payload = { sender_id: user.id, message: message || '', is_private: !!recipientId, recipient_id: recipientId || null };
    if (fileData) { payload.file_url = fileData.url; payload.file_type = fileData.type; payload.file_name = fileData.name; }
    const { data, error } = await sb.from('team_chat').insert(payload).select().single();
    if (error) return { ok: false, msg: error.message };

    const profile = await Auth.getProfile(user.id);
    const senderName = profile ? `${profile.vorname} ${profile.nachname}` : 'Teammitglied';
    const msgPreview = fileData ? '📎 Datei gesendet' : (message || '').substring(0, 80);

    if (recipientId) {
      // Private message → notify only the recipient
      await sb.from('notifications').insert({
        user_id: recipientId, type: 'chat_private',
        title: `🔒 ${senderName}`,
        message: msgPreview || 'Private Nachricht'
      });
    } else {
      // Group message → notify all team members except sender
      const { data: team } = await sb.from('profiles')
        .select('id').in('role', ['team', 'admin']).neq('id', user.id);
      if (team && team.length > 0) {
        await sb.from('notifications').insert(team.map(m => ({
          user_id: m.id, type: 'chat_group',
          title: `💬 ${senderName}`,
          message: msgPreview || 'Gruppennachricht'
        })));
      }
    }
    return { ok: true, msg: data };
  };

  const uploadChatFile = async (file) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const ext  = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('chat-files').upload(path, file, { upsert: false });
    if (error) return null;
    const { data: { publicUrl } } = sb.storage.from('chat-files').getPublicUrl(path);
    return { url: publicUrl, type: file.type, name: file.name };
  };

  /* ═══ ACTIVITY LOGS ════════════════════════════════════════ */

  const getActivityLogs = async (limit = 100, filters = {}) => {
    let q = sb.from('activity_logs').select(`*,
      user:profiles!activity_logs_user_id_fkey(id,vorname,nachname,role,avatar_url)
    `).order('created_at', { ascending: false }).limit(limit);
    if (filters.userId) q = q.eq('user_id', filters.userId);
    if (filters.action) q = q.eq('action', filters.action);
    if (filters.date) {
      const s = new Date(filters.date); s.setHours(0,0,0,0);
      const e = new Date(filters.date); e.setHours(23,59,59,999);
      q = q.gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
    }
    const { data } = await q;
    return data || [];
  };

  /* ═══ TEAM / PROFILES ═══════════════════════════════════ */

  const getTeamMembers  = async () => {
    const { data } = await sb.from('profiles').select('*').in('role', ['team','admin']).order('created_at');
    return data || [];
  };
  const getAllProfiles = async () => {
    const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    return data || [];
  };
  const getProfileById = async (id) => {
    const { data } = await sb.from('profiles').select('*').eq('id', id).single();
    return data;
  };
  const updateProfileById = async (id, updates) => {
    const { data, error } = await sb.from('profiles').update(updates).eq('id', id).select().single();
    if (error) return { ok: false, msg: error.message };
    return { ok: true, profile: data };
  };

  const getMitarbeiterDetails = async (userId) => {
    const [profileRes, logsRes, ordersRes] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId).single(),
      sb.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      sb.from('orders').select(`*, client:profiles!orders_client_id_fkey(id,vorname,nachname,email)`).eq('assigned_to', userId).order('created_at', { ascending: false })
    ]);
    // Messages sent by this person (as team)
    const { data: messages } = await sb.from('order_messages')
      .select(`*, order:orders(order_number,service)`)
      .eq('sender_id', userId).in('sender_role', ['team','admin'])
      .order('created_at', { ascending: false }).limit(30);
    return {
      profile:  profileRes.data  || null,
      logs:     logsRes.data     || [],
      orders:   ordersRes.data   || [],
      messages: messages         || []
    };
  };

  /* ═══ CLIENT MANAGEMENT ═══════════════════════════════════ */

  const getClientDetails = async (clientId) => {
    const [profileRes, ordersRes, invoicesRes] = await Promise.all([
      sb.from('profiles').select('*').eq('id', clientId).single(),
      sb.from('orders').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      sb.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    ]);
    return { profile: profileRes.data || null, orders: ordersRes.data || [], invoices: invoicesRes.data || [] };
  };
  const updateClientProfile = async (id, updates) => updateProfileById(id, updates);

  const deleteClient = async (clientId) => {
    const { data: os } = await sb.from('orders').select('id').eq('client_id', clientId);
    if (os?.length) {
      for (const o of os) {
        await sb.from('order_messages').delete().eq('order_id', o.id);
        await sb.from('invoices').delete().eq('order_id', o.id);
      }
    }
    await sb.from('invoices').delete().eq('client_id', clientId);
    await sb.from('orders').delete().eq('client_id', clientId);
    await sb.from('notifications').delete().eq('user_id', clientId);
    const { error } = await sb.from('profiles').delete().eq('id', clientId);
    return error ? { ok: false, msg: error.message } : { ok: true };
  };

  /* ═══ INVOICES ════════════════════════════════════════════ */

  const getInvoices = async (clientId = null) => {
    let q = sb.from('invoices').select(`*, order:orders(order_number,service,client_id,
      client:profiles!orders_client_id_fkey(vorname,nachname,email)
    )`).order('created_at', { ascending: false });
    if (clientId) q = q.eq('client_id', clientId);
    const { data } = await q;
    return data || [];
  };
  const createInvoice = async ({ orderId, clientId, betrag }) => {
    const nr = 'RG-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000);
    const { data, error } = await sb.from('invoices').insert({
      invoice_number: nr, order_id: orderId, client_id: clientId,
      betrag, datum: new Date().toISOString().split('T')[0]
    }).select().single();
    if (error) return { ok: false, msg: error.message };
    if (clientId) {
      await sb.from('notifications').insert({
        user_id: clientId, type: 'invoice', title: '🧾 Neue Rechnung',
        message: `Rechnung ${nr} über ${betrag} wurde erstellt.`, order_id: orderId
      });
    }
    return { ok: true, invoice: data };
  };
  const updateInvoice = async (id, updates) => {
    const { data, error } = await sb.from('invoices').update(updates).eq('id', id).select().single();
    return error ? { ok: false, msg: error.message } : { ok: true, invoice: data };
  };
  const getOrderInvoices = async (orderId) => {
    const { data } = await sb.from('invoices').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
    return data || [];
  };

  /* ═══ REVENUE REPORT ═══════════════════════════════════════ */

  const getRevenueReport = async (filters = {}) => {
    let q = sb.from('invoices').select(`*,
      order:orders(order_number, service,
        client:profiles!orders_client_id_fkey(id,vorname,nachname,email))
    `).order('created_at', { ascending: false });

    if (filters.status) q = q.eq('status', filters.status);
    else q = q.eq('status', 'Bezahlt'); // default: only paid

    if (filters.from) q = q.gte('created_at', filters.from);
    if (filters.to)   q = q.lte('created_at', filters.to + 'T23:59:59');
    if (filters.all)  q = sb.from('invoices').select(`*,
      order:orders(order_number, service,
        client:profiles!orders_client_id_fkey(id,vorname,nachname,email))
    `).order('created_at', { ascending: false });

    const { data } = await q;
    return data || [];
  };

  /* ═══ GUEST REQUESTS ═══════════════════════════════════════ */

  const createGuestRequest = async (data) => {
    const { data: res, error } = await sb.from('guest_requests').insert(data).select().single();
    if (error) return { ok: false, msg: error.message };
    // Notify team
    const { data: team } = await sb.from('profiles').select('id').in('role', ['team','admin']);
    if (team) {
      await sb.from('notifications').insert(team.map(m => ({
        user_id: m.id, type: 'new_guest', title: '📩 Neue Gastanfrage',
        message: `${data.name} fragt nach: ${data.service}`
      })));
    }
    return { ok: true, request: res };
  };

  const getGuestRequests = async () => {
    const { data } = await sb.from('guest_requests').select('*').order('created_at', { ascending: false });
    return data || [];
  };

  const updateGuestRequest = async (id, updates) => {
    const { data, error } = await sb.from('guest_requests').update(updates).eq('id', id).select().single();
    return error ? { ok: false, msg: error.message } : { ok: true, request: data };
  };

  /* ═══ CONTACT MESSAGES ════════════════════════════════════ */

  /* ═══ APPLICATIONS ════════════════════════════════════════ */

  const uploadApplicationFile = async (file, folder) => {
    const ext  = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await sb.storage.from('applications').upload(path, file, { upsert: false });
    if (error) return { ok: false, msg: error.message };
    const { data: { publicUrl } } = sb.storage.from('applications').getPublicUrl(path);
    return { ok: true, url: publicUrl, path };
  };

  const createApplication = async (appData, cvFile, fotoFile) => {
    let cv_url = '', cv_name = '', foto_url = '';
    if (cvFile) {
      const r = await uploadApplicationFile(cvFile, 'cv');
      if (!r.ok) return { ok: false, msg: 'CV-Upload fehlgeschlagen: ' + r.msg };
      cv_url  = r.url;
      cv_name = cvFile.name;
    }
    if (fotoFile) {
      const r = await uploadApplicationFile(fotoFile, 'foto');
      if (r.ok) foto_url = r.url;
    }
    const { error } = await sb.from('applications').insert({ ...appData, cv_url, cv_name, foto_url });
    if (error) return { ok: false, msg: error.message };
    // Notify admin(s)
    try {
      const { data: admins } = await sb.from('profiles').select('id').eq('role', 'admin');
      if (admins?.length) {
        await sb.from('notifications').insert(admins.map(a => ({
          user_id: a.id, type: 'new_application', title: '📋 Neue Bewerbung',
          message: `${appData.vorname} ${appData.nachname} — ${appData.stelle}`
        })));
      }
    } catch(_) {}
    return { ok: true };
  };

  const getApplications = async (filters = {}) => {
    let q = sb.from('applications').select(`
      *,
      handler:profiles!applications_handled_by_fkey(id,vorname,nachname)
    `).order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.stelle) q = q.eq('stelle', filters.stelle);
    const { data } = await q;
    return data || [];
  };

  const updateApplication = async (id, updates) => {
    const { data, error } = await sb.from('applications').update(updates).eq('id', id).select().single();
    return error ? { ok: false, msg: error.message } : { ok: true, application: data };
  };

  const deleteApplication = async (id) => {
    const { error } = await sb.from('applications').delete().eq('id', id);
    return error ? { ok: false, msg: error.message } : { ok: true };
  };

  /* ═══ CONTACT MESSAGES ════════════════════════════════════ */

  const createContactMessage = async (data) => {
    // Use insert without .select() — anon has no SELECT permission (by design)
    const { error } = await sb.from('contact_messages').insert(data);
    if (error) return { ok: false, msg: error.message };
    // Notification: only works if user is authenticated (team/admin sending on behalf of client)
    // Silent fail for anon — that's fine
    try {
      const { data: team } = await sb.from('profiles').select('id').in('role', ['team','admin']);
      if (team?.length) {
        await sb.from('notifications').insert(team.map(m => ({
          user_id: m.id, type: 'new_contact', title: '✉️ Neue Kontaktnachricht',
          message: `${data.name}: ${data.betreff}`
        })));
      }
    } catch(_) {}
    return { ok: true };
  };

  const getContactMessages = async (filters = {}) => {
    let q = sb.from('contact_messages').select(`
      *,
      handled:profiles!contact_messages_handled_by_fkey(id,vorname,nachname,avatar_url),
      beantwortet:profiles!contact_messages_beantwortet_von_fkey(id,vorname,nachname)
    `).order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    const { data } = await q;
    return data || [];
  };

  const updateContactMessage = async (id, updates) => {
    const { data, error } = await sb.from('contact_messages').update(updates).eq('id', id).select().single();
    return error ? { ok: false, msg: error.message } : { ok: true, message: data };
  };

  const deleteContactMessage = async (id) => {
    const { error } = await sb.from('contact_messages').delete().eq('id', id);
    return error ? { ok: false, msg: error.message } : { ok: true };
  };

  /* ═══ STATS ═════════════════════════════════════════════ */

  const getStats = async () => {
    const [
      { count: totalOrders }, { count: activeOrders }, { count: doneOrders },
      { count: totalClients }, { count: teamCount }, { count: guestCount }
    ] = await Promise.all([
      sb.from('orders').select('*', { count:'exact', head:true }),
      sb.from('orders').select('*', { count:'exact', head:true }).eq('status', 'Aktiv'),
      sb.from('orders').select('*', { count:'exact', head:true }).eq('status', 'Abgeschlossen'),
      sb.from('profiles').select('*', { count:'exact', head:true }).eq('role', 'client'),
      sb.from('profiles').select('*', { count:'exact', head:true }).in('role', ['team','admin']),
      sb.from('guest_requests').select('*', { count:'exact', head:true }).eq('status', 'Neu')
    ]);
    const { data: inv } = await sb.from('invoices').select('betrag').eq('status', 'Bezahlt');
    const revenue = (inv || []).reduce((s, i) => {
      return s + (parseFloat((i.betrag || '').replace(/[^0-9.,]/g,'').replace(',','.')) || 0);
    }, 0);
    return { totalOrders, activeOrders, doneOrders, totalClients, teamCount, revenue, guestCount };
  };

  const getOrdersByMonth = async () => {
    const six = new Date(); six.setMonth(six.getMonth() - 5);
    const { data } = await sb.from('orders').select('created_at,status')
      .gte('created_at', six.toISOString()).order('created_at');
    if (!data) return [];
    const months = {};
    data.forEach(o => {
      const m = new Date(o.created_at).toLocaleDateString('de-DE', { month:'short', year:'2-digit' });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).map(([label, count]) => ({ label, count }));
  };

  const getRevenueByMonth = async () => {
    const six = new Date(); six.setMonth(six.getMonth() - 5);
    const { data } = await sb.from('invoices').select('created_at,betrag')
      .eq('status', 'Bezahlt').gte('created_at', six.toISOString()).order('created_at');
    if (!data) return [];
    const months = {};
    data.forEach(inv => {
      const m = new Date(inv.created_at).toLocaleDateString('de-DE', { month:'short', year:'2-digit' });
      const amount = parseFloat((inv.betrag || '').replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
      months[m] = (months[m] || 0) + amount;
    });
    return Object.entries(months).map(([label, amount]) => ({ label, amount }));
  };

  return {
    createOrder, getOrders, getOrder, updateOrder, assignOrder, cancelOrder, setOrderPrice,
    getOrderMessages, sendOrderMessage,
    getNotifications, getUnreadCount, markNotifRead, markAllNotifsRead,
    getChatMessages, sendChatMessage, uploadChatFile,
    getActivityLogs,
    getTeamMembers, getAllProfiles, getProfileById, updateProfileById,
    getMitarbeiterDetails, getClientDetails, updateClientProfile, deleteClient,
    getInvoices, createInvoice, updateInvoice, getOrderInvoices,
    getRevenueReport, getRevenueByMonth,
    createGuestRequest, getGuestRequests, updateGuestRequest,
    createApplication, getApplications, updateApplication, deleteApplication,
    createContactMessage, getContactMessages, updateContactMessage, deleteContactMessage,
    getStats, getOrdersByMonth
  };
})();

window.DB = DB;
