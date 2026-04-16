/* ============================================================
   PROREINIGUNG — Supabase Client
   ============================================================ */
const SUPABASE_URL = "https://wuiiyewinbewjdyxmcvw.supabase.co";
const SUPABASE_KEY = "sb_publishable_iFB6nFCEPJlqYHBH5Sp_3A_VpPAfFmW";

window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});
