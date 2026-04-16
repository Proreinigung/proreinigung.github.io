/* ============================================================
   PROREINIGUNG — Auth (Supabase)
   ============================================================ */

const Auth = (() => {

  /* ── Register ─────────────────────────────────────────────── */
  const register = async ({ vorname, nachname, email, password, telefon = '' }) => {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { vorname, nachname, role: 'client', telefon }
      }
    });
    if (error) return { ok: false, msg: error.message };

    // Update profile with telefon
    if (data.user) {
      await sb.from('profiles').upsert({
        id: data.user.id,
        email,
        vorname,
        nachname,
        telefon,
        role: 'client'
      });
      await logActivity(data.user.id, 'register', 'Neues Konto erstellt');
    }
    return { ok: true, user: data.user };
  };

  /* ── Login ────────────────────────────────────────────────── */
  const login = async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: 'E-Mail oder Passwort ist falsch.' };

    const profile = await getProfile(data.user.id);

    // Set online
    await sb.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', data.user.id);

    await logActivity(data.user.id, 'login', 'Angemeldet');
    return { ok: true, user: data.user, profile };
  };

  /* ── Logout ───────────────────────────────────────────────── */
  const logout = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id);
      await logActivity(user.id, 'logout', 'Abgemeldet');
    }
    await sb.auth.signOut();
    window.location.href = '/index.html';
  };

  /* ── Current session ──────────────────────────────────────── */
  const current = async () => {
    const { data: { user } } = await sb.auth.getUser();
    return user || null;
  };

  /* ── Current sync (for non-async contexts) ────────────────── */
  const currentSync = () => {
    return sb.auth.getUser().then(({ data }) => data.user);
  };

  /* ── Get profile ──────────────────────────────────────────── */
  const getProfile = async (userId) => {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
    return data;
  };

  /* ── Require auth (redirect if not logged in) ─────────────── */
  const requireAuth = async (role = null) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = '/login.html'; return null; }
    if (role) {
      const profile = await getProfile(user.id);
      if (!profile || !role.includes(profile.role)) {
        window.location.href = '/index.html'; return null;
      }
      return { user, profile };
    }
    const profile = await getProfile(user.id);
    return { user, profile };
  };

  /* ── Require team auth ────────────────────────────────────── */
  const requireTeam = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { window.location.href = '/team/login.html'; return null; }
    const profile = await getProfile(user.id);
    if (!profile || !['team', 'admin'].includes(profile.role)) {
      window.location.href = '/team/login.html'; return null;
    }
    return { user, profile };
  };

  /* ── Update profile ───────────────────────────────────────── */
  const updateProfile = async (userId, data) => {
    const { error } = await sb.from('profiles').update(data).eq('id', userId);
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  };

  /* ── Change password ──────────────────────────────────────── */
  const changePassword = async (newPassword) => {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  };

  /* ── Upload avatar ────────────────────────────────────────── */
  const uploadAvatar = async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return { ok: false };
    const { data } = sb.storage.from('avatars').getPublicUrl(path);
    await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
    return { ok: true, url: data.publicUrl };
  };

  /* ── Add team member (admin only) ────────────────────────── */
  const addTeamMember = async ({ vorname, nachname, email, password, role = 'team' }) => {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      user_metadata: { vorname, nachname, role },
      email_confirm: true
    });
    if (error) return { ok: false, msg: error.message };
    await sb.from('profiles').upsert({ id: data.user.id, email, vorname, nachname, role });
    return { ok: true, user: data.user };
  };

  /* ── Promote to admin ─────────────────────────────────────── */
  const promoteToAdmin = async (userId) => {
    const { error } = await sb.from('profiles').update({ role: 'admin' }).eq('id', userId);
    return { ok: !error };
  };

  /* ── Log activity ─────────────────────────────────────────── */
  const logActivity = async (userId, action, details = '') => {
    await sb.from('activity_logs').insert({ user_id: userId, action, details });
  };

  /* ── Update navbar based on auth ──────────────────────────── */
  const updateNavbar = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const profile = await getProfile(user.id);
    document.querySelectorAll('.nav-login').forEach(el => {
      el.textContent = profile?.vorname || user.email;
      el.href = 'dashboard.html';
    });
    // Show notification bell for logged-in users
    document.querySelectorAll('.nav-notif-bell').forEach(el => {
      el.style.display = 'flex';
    });
  };

  const requireAdmin = async () => {
    const auth = await requireTeam();
    if (!auth) return null;
    if (auth.profile.role !== 'admin') {
      window.location.href = 'dashboard.html'; return null;
    }
    return auth;
  };

  return {
    register, login, logout, current, currentSync, getProfile,
    requireAuth, requireTeam, requireAdmin, updateProfile, changePassword,
    uploadAvatar, addTeamMember, promoteToAdmin, logActivity, updateNavbar
  };
})();

window.Auth = Auth;

// Auto update navbar
document.addEventListener('DOMContentLoaded', () => Auth.updateNavbar());
