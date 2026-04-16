import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/colors';

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [vorname, setVorname] = useState(profile?.vorname || '');
  const [nachname, setNachname] = useState(profile?.nachname || '');
  const [telefon, setTelefon] = useState(profile?.telefon || '');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const getInitials = () =>
    `${profile?.vorname?.[0] || ''}${profile?.nachname?.[0] || ''}`.toUpperCase();

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ vorname: vorname.trim(), nachname: nachname.trim(), telefon: telefon.trim() })
      .eq('id', user.id);
    if (error) {
      Alert.alert('Fehler', error.message);
    } else {
      await refreshProfile();
      setEditing(false);
      Alert.alert('Gespeichert', 'Profil erfolgreich aktualisiert.');
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Fehler', 'Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Fehler', 'Passwörter stimmen nicht überein.');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert('Fehler', error.message);
    } else {
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Erfolg', 'Passwort wurde geändert.');
    }
    setSavingPassword(false);
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0A0E1A', '#1565C0', '#00BCD4']} style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.headerName}>{profile?.vorname} {profile?.nachname}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name={profile?.role === 'admin' ? 'shield-checkmark' : 'person'} size={13} color="#fff" />
          <Text style={styles.roleText}>
            {profile?.role === 'admin' ? 'Administrator' : 'Teammitglied'}
          </Text>
        </View>
        <Text style={styles.headerEmail}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Profile Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profil-Informationen</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Ionicons name={editing ? 'close-circle-outline' : 'pencil-outline'} size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vorname</Text>
                <TextInput style={styles.input} value={vorname} onChangeText={setVorname} placeholder="Vorname" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nachname</Text>
                <TextInput style={styles.input} value={nachname} onChangeText={setNachname} placeholder="Nachname" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefon</Text>
                <TextInput style={styles.input} value={telefon} onChangeText={setTelefon} placeholder="+49 ..." keyboardType="phone-pad" />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Speichern</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <InfoRow icon="person-outline" label="Vorname" value={profile?.vorname} />
              <InfoRow icon="person-outline" label="Nachname" value={profile?.nachname} />
              <InfoRow icon="mail-outline" label="E-Mail" value={user?.email} />
              <InfoRow icon="call-outline" label="Telefon" value={profile?.telefon} />
              <InfoRow icon="shield-outline" label="Rolle" value={profile?.role === 'admin' ? 'Administrator' : 'Teammitglied'} />
            </>
          )}
        </View>

        {/* Change Password */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setChangingPassword(!changingPassword)}
          >
            <Text style={styles.cardTitle}>Passwort ändern</Text>
            <Ionicons name={changingPassword ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {changingPassword && (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Neues Passwort</Text>
                <TextInput
                  style={styles.input} value={newPassword} onChangeText={setNewPassword}
                  placeholder="Min. 6 Zeichen" secureTextEntry autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Passwort bestätigen</Text>
                <TextInput
                  style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
                  placeholder="Wiederholen" secureTextEntry autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, savingPassword && { opacity: 0.7 }]}
                onPress={changePassword}
                disabled={savingPassword}
              >
                {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Passwort ändern</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App-Informationen</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <InfoRow icon="phone-portrait-outline" label="Version" value="1.0.0" />
            <InfoRow icon="server-outline" label="Backend" value="Supabase" />
            <InfoRow icon="business-outline" label="Firma" value="Proreinigung GmbH" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingTop: 64, paddingBottom: 36, alignItems: 'center', gap: 8 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  headerName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  headerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  body: { padding: 16, gap: 14, marginTop: -16 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', marginTop: 2 },

  editForm: { gap: 12 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
});
