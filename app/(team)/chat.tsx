import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/colors';
import { ChatMessage, Profile } from '@/lib/types';

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('team_chat')
      .select(`*, sender:profiles!team_chat_sender_id_fkey(id,vorname,nachname,avatar_url,role), recipient:profiles!team_chat_recipient_id_fkey(id,vorname,nachname)`)
      .or(`is_private.eq.false,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(80);
    setMessages((data || []).reverse() as ChatMessage[]);
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['team', 'admin']);
    setTeamMembers((data || []).filter((m: Profile) => m.id !== user?.id));
  };

  useEffect(() => {
    Promise.all([fetchMessages(), fetchTeam()]).then(() => setLoading(false));

    const channel = supabase
      .channel('team-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat' }, async () => {
        await fetchMessages();
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const sendMessage = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const payload: any = {
      sender_id: user.id,
      message: text.trim(),
      is_private: !!selectedRecipient,
      recipient_id: selectedRecipient?.id || null,
    };
    await supabase.from('team_chat').insert(payload);

    // Send notification
    const senderName = profile ? `${profile.vorname} ${profile.nachname}` : 'Teammitglied';
    const preview = text.trim().substring(0, 80);
    if (selectedRecipient) {
      await supabase.from('notifications').insert({
        user_id: selectedRecipient.id, type: 'chat_private',
        title: `🔒 ${senderName}`, message: preview
      });
    } else {
      const others = teamMembers.filter(m => m.id !== user.id);
      if (others.length > 0) {
        await supabase.from('notifications').insert(others.map(m => ({
          user_id: m.id, type: 'chat_group',
          title: `💬 ${senderName}`, message: preview
        })));
      }
    }

    setText('');
    setSending(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const getInitials = (m: Profile) =>
    `${m.vorname?.[0] || ''}${m.nachname?.[0] || ''}`.toUpperCase();

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            {item.sender?.avatar_url ? (
              <Image source={{ uri: item.sender.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{item.sender ? getInitials(item.sender) : '?'}</Text>
            )}
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, item.is_private && styles.bubblePrivate]}>
          {!isMe && item.sender && (
            <Text style={styles.senderName}>{item.sender.vorname} {item.sender.nachname}</Text>
          )}
          {item.is_private && (
            <View style={styles.privateTag}>
              <Ionicons name="lock-closed" size={10} color={colors.primary} />
              <Text style={styles.privateTagText}>Privat</Text>
            </View>
          )}
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.message}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
            {new Date(item.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <LinearGradient colors={['#0A0E1A', '#1565C0']} style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
          <View>
            <Text style={styles.headerTitle}>Team-Chat</Text>
            <Text style={styles.headerSub}>
              {selectedRecipient ? `🔒 Privat: ${selectedRecipient.vorname}` : `${teamMembers.length + 1} Mitglieder`}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.memberBtn} onPress={() => setShowMemberList(!showMemberList)}>
          <Ionicons name="people-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Private recipient selector */}
      {showMemberList && (
        <View style={styles.memberList}>
          <TouchableOpacity
            style={[styles.memberItem, !selectedRecipient && styles.memberItemActive]}
            onPress={() => { setSelectedRecipient(null); setShowMemberList(false); }}
          >
            <Ionicons name="people" size={16} color={!selectedRecipient ? '#fff' : colors.primary} />
            <Text style={[styles.memberName, !selectedRecipient && { color: '#fff' }]}>Gruppe (alle)</Text>
          </TouchableOpacity>
          {teamMembers.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberItem, selectedRecipient?.id === m.id && styles.memberItemActive]}
              onPress={() => { setSelectedRecipient(m); setShowMemberList(false); }}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{getInitials(m)}</Text>
              </View>
              <Text style={[styles.memberName, selectedRecipient?.id === m.id && { color: '#fff' }]}>
                {m.vorname} {m.nachname}
                {m.role === 'admin' ? ' 👑' : ''}
              </Text>
              <View style={[styles.onlineDot, { backgroundColor: m.is_online ? colors.success : colors.textMuted }]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyChatText}>Noch keine Nachrichten. Starte das Gespräch!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        {selectedRecipient && (
          <TouchableOpacity style={styles.recipientTag} onPress={() => setSelectedRecipient(null)}>
            <Ionicons name="lock-closed" size={12} color={colors.primary} />
            <Text style={styles.recipientTagText}>{selectedRecipient.vorname}</Text>
            <Ionicons name="close-circle" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={selectedRecipient ? `Privat an ${selectedRecipient.vorname}...` : 'Nachricht an alle...'}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  memberBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  memberList: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  memberItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginHorizontal: 8, marginVertical: 2 },
  memberItemActive: { backgroundColor: colors.primary },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },

  msgList: { padding: 16, gap: 4, flexGrow: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowMe: { flexDirection: 'row-reverse' },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12, paddingBottom: 8 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubblePrivate: { borderWidth: 1.5, borderColor: 'rgba(21,101,192,0.3)' },

  senderName: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  privateTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  privateTagText: { fontSize: 10, color: colors.primary, fontWeight: '600' },

  msgText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.6)' },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyChatText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 200 },

  inputBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 10 },
  recipientTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  recipientTagText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
