-- ============================================================
-- PROREINIGUNG — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles (extends auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  vorname       TEXT DEFAULT '',
  nachname      TEXT DEFAULT '',
  role          TEXT DEFAULT 'client' CHECK (role IN ('client', 'team', 'admin')),
  avatar_url    TEXT,
  telefon       TEXT DEFAULT '',
  is_online     BOOLEAN DEFAULT FALSE,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number  TEXT UNIQUE NOT NULL,
  client_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service       TEXT NOT NULL,
  adresse       TEXT DEFAULT '',
  datum         DATE,
  flaeche       TEXT DEFAULT '',
  frequenz      TEXT DEFAULT '',
  budget        TEXT DEFAULT '',
  kommentar     TEXT DEFAULT '',
  status        TEXT DEFAULT 'Ausstehend' CHECK (status IN ('Ausstehend','Aktiv','Abgeschlossen','Storniert')),
  preis         TEXT DEFAULT '',
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Order Messages (client ↔ team per order) ───────────────
CREATE TABLE IF NOT EXISTS order_messages (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role   TEXT DEFAULT 'client',
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT DEFAULT 'info',
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Team Chat (internal) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS team_chat (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activity Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  details       TEXT DEFAULT '',
  ip            TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  betrag        TEXT DEFAULT '',
  datum         DATE DEFAULT CURRENT_DATE,
  status        TEXT DEFAULT 'Offen' CHECK (status IN ('Offen','Bezahlt','Storniert')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, vorname, nachname, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-generate order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile"       ON profiles FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('team','admin'));
CREATE POLICY "Users can update own profile"     ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Team/Admin can update any profile" ON profiles FOR UPDATE USING (get_my_role() IN ('team','admin'));

-- Orders policies
CREATE POLICY "Clients see own orders"           ON orders FOR SELECT USING (client_id = auth.uid() OR get_my_role() IN ('team','admin'));
CREATE POLICY "Clients can create orders"        ON orders FOR INSERT WITH CHECK (client_id = auth.uid() OR get_my_role() IN ('team','admin'));
CREATE POLICY "Team/Admin can update orders"     ON orders FOR UPDATE USING (get_my_role() IN ('team','admin'));

-- Order messages
CREATE POLICY "View messages for accessible orders" ON order_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.client_id = auth.uid() OR get_my_role() IN ('team','admin')))
);
CREATE POLICY "Insert messages for accessible orders" ON order_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.client_id = auth.uid() OR get_my_role() IN ('team','admin')))
);

-- Notifications
CREATE POLICY "Users see own notifications"      ON notifications FOR SELECT USING (user_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "System can create notifications"  ON notifications FOR INSERT WITH CHECK (get_my_role() IN ('team','admin') OR auth.uid() IS NOT NULL);
CREATE POLICY "Users update own notifications"   ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Team chat
CREATE POLICY "Team/Admin can read chat"         ON team_chat FOR SELECT USING (get_my_role() IN ('team','admin'));
CREATE POLICY "Team/Admin can send chat"         ON team_chat FOR INSERT WITH CHECK (get_my_role() IN ('team','admin'));

-- Activity logs
CREATE POLICY "Admin sees all logs"              ON activity_logs FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "Users can insert own logs"        ON activity_logs FOR INSERT WITH CHECK (user_id = auth.uid() OR get_my_role() = 'admin');

-- Invoices
CREATE POLICY "Clients see own invoices"         ON invoices FOR SELECT USING (client_id = auth.uid() OR get_my_role() IN ('team','admin'));
CREATE POLICY "Team/Admin manage invoices"       ON invoices FOR ALL USING (get_my_role() IN ('team','admin'));

-- ═══════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE team_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ═══════════════════════════════════════════════
-- STORAGE BUCKET (run separately if needed)
-- ═══════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
