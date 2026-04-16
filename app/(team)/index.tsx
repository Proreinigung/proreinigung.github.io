import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, statusColors, statusBg } from '@/lib/colors';
import { Stats, Order } from '@/lib/types';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function OrderItem({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.orderItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.orderItemLeft}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <Text style={styles.orderService} numberOfLines={1}>{order.service}</Text>
        <Text style={styles.orderClient} numberOfLines={1}>
          {order.client ? `${order.client.vorname} ${order.client.nachname}` : '—'}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusBg[order.status] }]}>
        <Text style={[styles.statusText, { color: statusColors[order.status] }]}>{order.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [
      { count: totalOrders }, { count: activeOrders }, { count: doneOrders },
      { count: totalClients }, { count: teamCount }, { count: guestCount }
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Aktiv'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Abgeschlossen'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['team', 'admin']),
      supabase.from('guest_requests').select('*', { count: 'exact', head: true }).eq('status', 'Neu'),
    ]);

    const { data: inv } = await supabase.from('invoices').select('betrag').eq('status', 'Bezahlt');
    const revenue = (inv || []).reduce((s: number, i: { betrag: string }) => {
      return s + (parseFloat((i.betrag || '').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0);
    }, 0);

    setStats({ totalOrders: totalOrders || 0, activeOrders: activeOrders || 0, doneOrders: doneOrders || 0, totalClients: totalClients || 0, teamCount: teamCount || 0, revenue, guestCount: guestCount || 0 });

    const { data: orders } = await supabase
      .from('orders')
      .select(`*, client:profiles!orders_client_id_fkey(id,vorname,nachname,email)`)
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentOrders(orders || []);
  };

  const load = async () => {
    await fetchData();
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#0A0E1A', '#1565C0', '#00BCD4']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{profile?.vorname || 'Team'} 👋</Text>
            <Text style={styles.userRole}>
              {profile?.role === 'admin' ? 'Administrator' : 'Teammitglied'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/(team)/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Revenue Banner */}
        <LinearGradient colors={['#0A0E1A', '#1565C0']} style={styles.revenueBanner}>
          <View>
            <Text style={styles.revenueLabel}>Gesamtumsatz (bezahlt)</Text>
            <Text style={styles.revenueValue}>
              € {stats ? stats.revenue.toFixed(2).replace('.', ',') : '0,00'}
            </Text>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="trending-up" size={32} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Übersicht</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="clipboard-outline" label="Aufträge gesamt" value={stats?.totalOrders || 0} color="#3B82F6" bg="#EFF6FF" />
          <StatCard icon="flash-outline" label="Aktiv" value={stats?.activeOrders || 0} color="#22C55E" bg="#F0FDF4" />
          <StatCard icon="checkmark-circle-outline" label="Abgeschlossen" value={stats?.doneOrders || 0} color="#8B5CF6" bg="#F5F3FF" />
          <StatCard icon="people-outline" label="Kunden" value={stats?.totalClients || 0} color="#F59E0B" bg="#FFFBEB" />
          <StatCard icon="person-add-outline" label="Gastanfragen" value={stats?.guestCount || 0} color="#EC4899" bg="#FDF2F8" />
          <StatCard icon="briefcase-outline" label="Team" value={stats?.teamCount || 0} color={colors.primary} bg="#EFF6FF" />
        </View>

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Neueste Aufträge</Text>
          <TouchableOpacity onPress={() => router.push('/(team)/orders')}>
            <Text style={styles.seeAll}>Alle anzeigen →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Keine Aufträge vorhanden</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {recentOrders.map(order => (
              <OrderItem
                key={order.id}
                order={order}
                onPress={() => router.push(`/(team)/orders/${order.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },

  body: { padding: 20, paddingTop: 0, marginTop: -16 },

  revenueBanner: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  revenueValue: { fontSize: 30, fontWeight: '800', color: '#fff' },
  revenueIcon: { opacity: 0.6 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: {},
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  ordersList: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderItemLeft: { flex: 1 },
  orderNumber: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  orderService: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  orderClient: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 40,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 24,
  },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
