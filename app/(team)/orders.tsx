import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, statusColors, statusBg } from '@/lib/colors';
import { Order, OrderStatus } from '@/lib/types';

const STATUSES: (OrderStatus | 'Alle')[] = ['Alle', 'Neu', 'Aktiv', 'Abgeschlossen', 'Storniert'];

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'Alle'>('Alle');

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`*, client:profiles!orders_client_id_fkey(id,vorname,nachname,email,telefon), assigned:profiles!orders_assigned_to_fkey(id,vorname,nachname,avatar_url)`)
      .order('created_at', { ascending: false });
    const list = data || [];
    setOrders(list);
    applyFilter(list, activeStatus, search);
  };

  const applyFilter = (list: Order[], status: OrderStatus | 'Alle', q: string) => {
    let result = status === 'Alle' ? list : list.filter(o => o.status === status);
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(lower) ||
        o.service?.toLowerCase().includes(lower) ||
        o.client?.vorname?.toLowerCase().includes(lower) ||
        o.client?.nachname?.toLowerCase().includes(lower)
      );
    }
    setFiltered(result);
  };

  useEffect(() => { applyFilter(orders, activeStatus, search); }, [activeStatus, search]);

  const load = async () => { await fetchOrders(); setLoading(false); };
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); }, [activeStatus, search]);

  useEffect(() => { load(); }, []);

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(team)/orders/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNum}>{item.order_number}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusBg[item.status] }]}>
          <Text style={[styles.statusPillText, { color: statusColors[item.status] }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.service} numberOfLines={1}>{item.service}</Text>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {item.client ? `${item.client.vorname} ${item.client.nachname}` : '—'}
          </Text>
        </View>
        {item.adresse && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.adresse}</Text>
          </View>
        )}
        {item.datum && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.datum} {item.uhrzeit || ''}</Text>
          </View>
        )}
        {item.preis_agreed && (
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success, fontWeight: '700' }]}>€ {item.preis_agreed}</Text>
          </View>
        )}
      </View>

      {item.assigned && (
        <View style={styles.assignedRow}>
          <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
          <Text style={styles.assignedText}>{item.assigned.vorname} {item.assigned.nachname}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aufträge</Text>
        <Text style={styles.headerSub}>{filtered.length} Einträge</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Auftrag, Kunde, Service..."
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <FlatList
        horizontal
        data={STATUSES}
        keyExtractor={s => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterPill, activeStatus === item && styles.filterPillActive]}
            onPress={() => setActiveStatus(item)}
          >
            <Text style={[styles.filterPillText, activeStatus === item && styles.filterPillTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Orders */}
      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Keine Aufträge gefunden</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

  filterList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterPillTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 13, fontWeight: '700', color: colors.primary },
  orderDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  service: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },

  cardMeta: { gap: 6, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textSecondary },

  assignedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 4,
  },
  assignedText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  chevron: { position: 'absolute', right: 18, top: '50%' },

  emptyState: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
});
