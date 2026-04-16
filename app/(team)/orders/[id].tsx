import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { colors, statusColors, statusBg } from '@/lib/colors';
import { Order, OrderMessage, Profile, OrderStatus } from '@/lib/types';

const ORDER_STATUSES: OrderStatus[] = ['Neu', 'Aktiv', 'Abgeschlossen', 'Storniert'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const scrollRef = useRef<FlatList>(null);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`*, client:profiles!orders_client_id_fkey(id,vorname,nachname,email,telefon,adresse), assigned:profiles!orders_assigned_to_fkey(id,vorname,nachname,avatar_url)`)
      .eq('id', id)
      .single();
    setOrder(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('order_messages')
      .select(`*, sender:profiles!order_messages_sender_id_fkey(id,vorname,nachname,role,avatar_url)`)
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['team', 'admin']);
    setTeamMembers(data || []);
  };

  useEffect(() => {
    Promise.all([fetchOrder(), fetchMessages(), fetchTeam()]).then(() => setLoading(false));

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'order_messages',
        filter: `order_id=eq.${id}`
      }, () => { fetchMessages(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const updateStatus = async (status: OrderStatus) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrder(prev => prev ? { ...prev, status } : null);
      // Notify client
      if (order?.client_id) {
        const labels: Record<string, string> = {
          Aktiv: '✅ Ihr Auftrag wurde angenommen!',
          Abgeschlossen: '🏆 Ihr Auftrag wurde abgeschlossen!',
          Storniert: '❌ Ihr Auftrag wurde storniert.'
        };
        await supabase.from('notifications').insert({
          user_id: order.client_id, type: 'order_update', title: '📋 Auftrag aktualisiert',
          message: labels[status] || `Auftrag ${order.order_number} aktualisiert.`, order_id: id
        });
      }
    }
    setUpdatingStatus(false);
  };

  const assignToMe = async () => {
    if (!user || !order) return;
    Alert.alert('Auftrag zuweisen', 'Diesen Auftrag dir zuweisen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Zuweisen', onPress: async () => {
          await supabase.from('orders').update({ assigned_to: user.id, status: 'Aktiv' }).eq('id', id);
          await fetchOrder();
        }
      }
    ]);
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !user) return;
    setSendingMsg(true);
    const p = profile;
    await supabase.from('order_messages').insert({
      order_id: id, sender_id: user.id,
      sender_role: p?.role || 'team', message: msgText.trim()
    });
    // Notify client
    if (order?.client_id) {
      await supabase.from('notifications').insert({
        user_id: order.client_id, type: 'new_message', title: '💬 Neue Nachricht',
        message: `Team antwortet auf Auftrag ${order?.order_number}`, order_id: id
      });
    }
    setMsgText('');
    await fetchMessages();
    setSendingMsg(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Auftrag nicht gefunden</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <LinearGradient colors={['#0A0E1A', '#1565C0']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{order.order_number}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusBg[order.status] }]}>
            <Text style={[styles.statusPillText, { color: statusColors[order.status] }]}>{order.status}</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceText}>{order.service}</Text>
          {order.notizen && <Text style={styles.notizen}>{order.notizen}</Text>}
        </View>

        {/* Client Info */}
        {order.client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kunde</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{order.client.vorname} {order.client.nachname}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{order.client.email}</Text>
            </View>
            {order.client.telefon && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={15} color={colors.textMuted} />
                <Text style={styles.infoText}>{order.client.telefon}</Text>
              </View>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {order.adresse && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{order.adresse}</Text>
            </View>
          )}
          {order.datum && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{order.datum} {order.uhrzeit || ''}</Text>
            </View>
          )}
          {order.preis_agreed && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={15} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.success, fontWeight: '700' }]}>€ {order.preis_agreed}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {new Date(order.created_at).toLocaleDateString('de-DE', { dateStyle: 'full' })}
            </Text>
          </View>
        </View>

        {/* Status Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status ändern</Text>
          <View style={styles.statusGrid}>
            {ORDER_STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  { borderColor: statusColors[s] },
                  order.status === s && { backgroundColor: statusColors[s] }
                ]}
                onPress={() => updateStatus(s)}
                disabled={updatingStatus || order.status === s}
              >
                <Text style={[styles.statusBtnText, { color: order.status === s ? '#fff' : statusColors[s] }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Assign */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zuweisung</Text>
          {order.assigned ? (
            <View style={styles.assignedBox}>
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.assignedName}>{order.assigned.vorname} {order.assigned.nachname}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.assignBtn} onPress={assignToMe}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text style={styles.assignBtnText}>Mir zuweisen</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nachrichten ({messages.length})</Text>
          {messages.length === 0 ? (
            <Text style={styles.noMessages}>Noch keine Nachrichten.</Text>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              const isTeam = ['team', 'admin'].includes(msg.sender_role);
              return (
                <View key={msg.id} style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                  {!isMe && (
                    <Text style={styles.msgSender}>
                      {msg.sender ? `${msg.sender.vorname} ${msg.sender.nachname}` : '?'}
                      {isTeam ? ' (Team)' : ' (Kunde)'}
                    </Text>
                  )}
                  <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{msg.message}</Text>
                  <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                    {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Message Input */}
      <View style={styles.msgInput}>
        <TextInput
          style={styles.msgInputField}
          value={msgText}
          onChangeText={setMsgText}
          placeholder="Nachricht schreiben..."
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!msgText.trim() || sendingMsg) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!msgText.trim() || sendingMsg}
        >
          {sendingMsg ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: colors.textMuted },
  back: { color: colors.primary, marginTop: 12, fontSize: 15 },

  header: {
    paddingTop: 56, paddingBottom: 18, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statusPill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1 },

  section: {
    backgroundColor: '#fff', borderRadius: 20, margin: 16, marginBottom: 0,
    padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  serviceText: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  notizen: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 14, color: colors.textSecondary, flex: 1 },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    borderWidth: 2, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  statusBtnText: { fontSize: 13, fontWeight: '700' },

  assignedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
  },
  assignedName: { fontSize: 14, fontWeight: '700', color: colors.primary },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.primary, borderRadius: 12,
    padding: 12, alignSelf: 'flex-start',
  },
  assignBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  noMessages: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  msgBubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8,
  },
  msgMe: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: colors.background, borderBottomLeftRadius: 4 },
  msgSender: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' },
  msgText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

  msgInput: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border,
  },
  msgInputField: {
    flex: 1, backgroundColor: colors.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
