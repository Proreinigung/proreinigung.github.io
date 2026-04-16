import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/colors';
import { Notification } from '@/lib/types';

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  new_order:    { icon: 'clipboard',           color: '#3B82F6', bg: '#EFF6FF' },
  order_update: { icon: 'refresh-circle',      color: '#8B5CF6', bg: '#F5F3FF' },
  new_message:  { icon: 'chatbubble',          color: '#22C55E', bg: '#F0FDF4' },
  chat_private: { icon: 'lock-closed',         color: '#1565C0', bg: '#EFF6FF' },
  chat_group:   { icon: 'chatbubbles',         color: '#0288D1', bg: '#E0F7FA' },
  invoice:      { icon: 'receipt',             color: '#F59E0B', bg: '#FFFBEB' },
  default:      { icon: 'notifications',       color: '#6B7280', bg: '#F3F4F6' },
};

function NotifItem({ item, onPress, onMarkRead }: { item: Notification; onPress: () => void; onMarkRead: () => void }) {
  const meta = TYPE_ICONS[item.type] || TYPE_ICONS.default;
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'gerade eben';
    if (m < 60) return `vor ${m} Min.`;
    const h = Math.floor(m / 60);
    if (h < 24) return `vor ${h} Std.`;
    return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  return (
    <TouchableOpacity
      style={[styles.notifCard, !item.read && styles.notifCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>
      <View style={styles.notifBody}>
        <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
      </View>
      <View style={styles.notifRight}>
        {!item.read && <View style={styles.unreadDot} />}
        <TouchableOpacity onPress={onMarkRead} style={styles.readBtn}>
          <Ionicons name={item.read ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={item.read ? colors.success : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = data || [];
    setNotifications(list);
    setUnreadCount(list.filter((n: Notification) => !n.read).length);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const load = async () => { await fetchNotifications(); setLoading(false); };
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); }, []);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel('notif-screen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handlePress = (item: Notification) => {
    if (!item.read) markRead(item.id);
    if (item.order_id) router.push(`/(team)/orders/${item.order_id}`);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0A0E1A', '#1565C0']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Meldungen</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSub}>{unreadCount} ungelesen</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.markAllText}>Alle gelesen</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={({ item }) => (
          <NotifItem
            item={item}
            onPress={() => handlePress(item)}
            onMarkRead={() => markRead(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Keine Meldungen</Text>
            <Text style={styles.emptyText}>Alle Benachrichtigungen erscheinen hier.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  listContent: { padding: 16, gap: 10, flexGrow: 1 },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  notifCardUnread: {
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    backgroundColor: '#FAFCFF',
  },
  notifIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  notifMsg: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.textMuted, marginTop: 5 },
  notifRight: { alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  readBtn: { padding: 2 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
