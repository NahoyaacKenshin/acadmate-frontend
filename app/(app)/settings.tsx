import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Vibration,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import {
  LogOut,
  User,
  Bell,
  Info,
  Smile,
  Layers,
  Smartphone,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';

import { useNotificationStore, NotificationPrefs } from '@/src/store/notificationStore';

type ToggleablePref = 'classReminders' | 'taskReminders' | 'examAlerts' | 'studyReminders';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const { studentSet, nickname, setStudentSet, setNickname } = useUserStore();
  const { prefs, updatePrefs } = useNotificationStore();

  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Compute 2-letter user initials for avatar
  const userInitials = useMemo(() => {
    if (!user?.name) return null;
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.name]);

  const triggerHaptic = () => {
    try {
      Vibration.vibrate(15);
    } catch {}
  };

  const handleSaveNickname = async () => {
    triggerHaptic();
    const trimmed = nicknameInput.trim();
    await setNickname(trimmed);
    setIsEditingNickname(false);
  };

  const handleCancelNickname = () => {
    triggerHaptic();
    setNicknameInput(nickname ?? '');
    setIsEditingNickname(false);
  };

  const handleSetStudentSet = (s: 'Standard' | 'A' | 'B') => {
    triggerHaptic();
    setStudentSet(s);
  };

  const handleTogglePref = (key: ToggleablePref) => {
    triggerHaptic();
    updatePrefs({ [key]: !prefs[key] });
  };

  const handleLeadMinutes = (mins: number) => {
    triggerHaptic();
    updatePrefs({ classLeadMinutes: mins });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {userInitials ? (
              <Text style={styles.avatarText}>{userInitials}</Text>
            ) : (
              <User size={24} color="#ffffff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name ?? 'AcadMate Student'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? 'No email'}
            </Text>
          </View>
          <View style={styles.profileBadge}>
            <Sparkles size={10} color="#6C8EFF" />
            <Text style={styles.profileBadgeText}>Student</Text>
          </View>
        </View>

        {/* Academic Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Academic Configuration</Text>

          {/* Nickname Tile */}
          <View style={styles.tile}>
            <Smile size={20} color="#6C8EFF" />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitle}>Nickname</Text>
              {isEditingNickname ? (
                <TextInput
                  style={styles.nicknameInput}
                  value={nicknameInput}
                  onChangeText={setNicknameInput}
                  autoFocus
                  maxLength={24}
                  autoCorrect={false}
                  onSubmitEditing={handleSaveNickname}
                  returnKeyType="done"
                  placeholder="Enter nickname…"
                  placeholderTextColor="#4A5568"
                />
              ) : (
                <Text style={styles.tileValue}>{nickname || 'Not set'}</Text>
              )}
            </View>

            {isEditingNickname ? (
              <View style={styles.editBtnRow}>
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={handleCancelNickname}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveActionBtn}
                  onPress={handleSaveNickname}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Check size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable
                style={styles.editPill}
                onPress={() => {
                  triggerHaptic();
                  setNicknameInput(nickname ?? '');
                  setIsEditingNickname(true);
                }}
              >
                <Text style={styles.editPillText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Schedule Modality / Set Tile */}
          <View style={styles.tile}>
            <Layers size={20} color="#6C8EFF" />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitle}>Schedule Set</Text>
              <Text style={styles.tileValue}>
                {studentSet === 'A'
                  ? 'Set A – Alternating'
                  : studentSet === 'B'
                  ? 'Set B – Alternating'
                  : 'Standard / Regular'}
              </Text>
            </View>
          </View>

          <View style={styles.setSelectorRow}>
            {(['Standard', 'A', 'B'] as const).map((s) => {
              const isSel = studentSet === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.setPill, isSel && styles.setPillActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => handleSetStudentSet(s)}
                >
                  <Text style={[styles.setPillText, isSel && styles.setPillTextActive]}>
                    {s === 'Standard' ? 'Standard' : `Set ${s}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preferences & Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences & Notifications</Text>

          {/* Class Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('classReminders')}
          >
            <Bell size={20} color={prefs.classReminders ? '#6C8EFF' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Class Reminders</Text>
              <Text style={styles.tileValueSub}>
                {prefs.classReminders ? `Active (${prefs.classLeadMinutes}m before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.classReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.classReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Class Lead Time Option */}
          {prefs.classReminders && (
            <View style={styles.leadMinutesRow}>
              {[5, 10, 15, 30].map((mins) => {
                const isSel = prefs.classLeadMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    style={[styles.leadMinutesPill, isSel && styles.leadMinutesPillActive]}
                    onPress={() => handleLeadMinutes(mins)}
                  >
                    <Text style={[styles.leadMinutesText, isSel && styles.leadMinutesTextActive]}>
                      {mins}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Task Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('taskReminders')}
          >
            <Bell size={20} color={prefs.taskReminders ? '#10B981' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Task Due Alerts</Text>
              <Text style={styles.tileValueSub}>
                {prefs.taskReminders ? '1 day & 1 hour before' : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.taskReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.taskReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Exam Alerts Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('examAlerts')}
          >
            <Bell size={20} color={prefs.examAlerts ? '#F59E0B' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Exam Week Alerts</Text>
              <Text style={styles.tileValueSub}>
                {prefs.examAlerts ? 'Active' : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.examAlerts && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.examAlerts && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Study Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('studyReminders')}
          >
            <Bell size={20} color={prefs.studyReminders ? '#A78BFA' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Notebook Study Reminders</Text>
              <Text style={styles.tileValueSub}>
                {prefs.studyReminders ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.studyReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.studyReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Device Specific Guidance Card */}
          <View style={styles.deviceNoteBox}>
            <View style={styles.deviceNoteHeader}>
              <Smartphone size={14} color="#6C8EFF" />
              <Text style={styles.deviceNoteTitle}>Device Optimization Tip</Text>
            </View>
            <Text style={styles.deviceNoteText}>
              For Xiaomi, HyperOS, and Oppo users: Turn on "Floating notifications" and "Sound" in your phone's App Notification settings to allow drop-down pop-up banners.
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>About</Text>

          <View style={styles.tile}>
            <Info size={20} color="#6C8EFF" />
            <Text style={styles.tileTitleFlex}>About AcadMate</Text>
            <Text style={styles.tileValueSub}>v1.0.0</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.footer}>
          <Button
            disabled={isLoading}
            onPress={() => {
              triggerHaptic();
              setShowLogoutModal(true);
            }}
            variant="destructive"
            style={styles.logoutBtn}
          >
            <LogOut size={18} color="#ffffff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Sign Out"
        description="Are you sure you want to sign out of AcadMate on this device?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 10,
    gap: 12,
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tileTitleFlex: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  tileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  nicknameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C8EFF',
    marginTop: 2,
    padding: 0,
  },
  editBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E2433',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  saveActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    backgroundColor: 'rgba(108,142,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
  },
  editPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  tileValueSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  setSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#10131C',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  setPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },
  setPillActive: {
    backgroundColor: '#6C8EFF',
  },
  setPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  setPillTextActive: {
    color: '#ffffff',
  },
  footer: {
    marginTop: 14,
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Switch styling
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A3143',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#6C8EFF',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94A3B8',
  },
  switchThumbActive: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-end',
  },
  leadMinutesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  leadMinutesPill: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadMinutesPillActive: {
    backgroundColor: 'rgba(108,142,255,0.15)',
    borderColor: '#6C8EFF',
  },
  leadMinutesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  leadMinutesTextActive: {
    color: '#6C8EFF',
  },
  deviceNoteBox: {
    backgroundColor: '#161A26',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#232A3B',
    gap: 6,
  },
  deviceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  deviceNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A99AD',
  },
});
