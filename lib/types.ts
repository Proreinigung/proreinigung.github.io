export type UserRole = 'client' | 'team' | 'admin';

export interface Profile {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  role: UserRole;
  telefon?: string;
  adresse?: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: string;
  created_at?: string;
}

export type OrderStatus = 'Neu' | 'Aktiv' | 'Abgeschlossen' | 'Storniert';

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  assigned_to?: string;
  service: string;
  adresse?: string;
  datum?: string;
  uhrzeit?: string;
  status: OrderStatus;
  notizen?: string;
  preis_agreed?: string;
  created_at: string;
  client?: Profile;
  assigned?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  order_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id?: string;
  message: string;
  is_private: boolean;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export interface Stats {
  totalOrders: number;
  activeOrders: number;
  doneOrders: number;
  totalClients: number;
  teamCount: number;
  revenue: number;
  guestCount: number;
}

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
  sender?: Profile;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  client_id: string;
  betrag: string;
  status: string;
  datum: string;
  created_at: string;
}

export interface GuestRequest {
  id: string;
  name: string;
  email: string;
  telefon?: string;
  service: string;
  nachricht?: string;
  status: string;
  created_at: string;
}
