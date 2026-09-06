import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore } from '@/src/store/userStore';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import {
  LogOut,
  User,
  Bell,
  Info,
  Smile,
  ChevronRight,
  Layers,
  Send,
} from 'lucide-react-native';

import { useNotificationStore } from '@/src/store/notificationStore';
import { NotificationService } from '@/src/services/notificationService';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const { studentSet, nickname, setStudentSet, setNickname } = useUserStore();
  const { prefs, updatePrefs } = useNotificationStore();
  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={24} color="#ffffff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name ?? 'Acadmate User'}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email ?? 'No email'}
            </Text>
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
                    onSubmitEditing={async () => {
                      await setNickname(nicknameInput);
                      setIsEditingNickname(false);
                    }}
                    returnKeyType="done"
                    placeholder="Enter nickname…"
                    placeholderTextColor="#4A5568"
                  />
                ) : (
                  <Text style={styles.tileValue}>{nickname ?? 'Not set'}</Text>
                )}
              </View>
              <Pressable
                style={styles.editPill}
                onPress={async () => {
                  if (isEditingNickname) {
                    await setNickname(nicknameInput);
                    setIsEditingNickname(false);
                  } else {
                    setNicknameInput(nickname ?? '');
                    setIsEditingNickname(true);
                  }
                }}
              >
                <Text style={styles.editPillText}>
                  {isEditingNickname ? 'Save' : 'Edit'}
                </Text>
              </Pressable>
            </View>

            {/* Schedule Modality / Set Tile */}
            <View style={styles.tile}>
              <Layers size={20} color="#6C8EFF" />
              <View style={styles.tileContent}>
                <Text style={styles.tileTitle}>Schedule Set</Text>
                <Text style={styles.tileValue}>
                  {studentSet === 'A' ? 'Set A – Alternating' : studentSet === 'B' ? 'Set B – Alternating' : 'Standard / Regular'}
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
                    onPress={() => setStudentSet(s)}
                  >
                    <Text style={[styles.setPillText, isSel && styles.setPillTextActive]}>
                      {s === 'Standard' ? 'Standard' : `Set ${s}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>


        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences & Notifications</Text>

          {/* Class Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => updatePrefs({ classReminders: !prefs.classReminders })}
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

          {/* Class Lead Time Option (Visible only when class reminders are on) */}
          {prefs.classReminders && (
            <View style={styles.leadMinutesRow}>
              {[5, 10, 15, 30].map((mins) => {
                const isSel = prefs.classLeadMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    style={[styles.leadMinutesPill, isSel && styles.leadMinutesPillActive]}
                    onPress={() => updatePrefs({ classLeadMinutes: mins })}
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
            onPress={() => updatePrefs({ taskReminders: !prefs.taskReminders })}
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
            onPress={() => updatePrefs({ examAlerts: !prefs.examAlerts })}
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
            onPress={() => updatePrefs({ studyReminders: !prefs.studyReminders })}
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

          {/* Test Notification Trigger */}
          <Pressable
            style={styles.tile}
            disabled={isTestingNotif}
            onPress={async () => {
              setIsTestingNotif(true);
              try {
                await NotificationService.sendTestNotification(3);
              } finally {
                setTimeout(() => setIsTestingNotif(false), 3500);
              }
            }}
          >
            <Send size={20} color={isTestingNotif ? '#10B981' : '#6C8EFF'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>
                {isTestingNotif ? 'Sending Alert (3s)...' : 'Test Notification'}
              </Text>
              <Text style={styles.tileValueSub}>
                {isTestingNotif ? 'Check your status bar in 3s' : 'Trigger 3-second test alert'}
              </Text>
            </View>
            <View style={styles.testBtnPill}>
              <Text style={styles.testBtnText}>{isTestingNotif ? 'Pending...' : 'Send'}</Text>
            </View>
          </Pressable>

          <View style={styles.deviceNoteBox}>
            <Text style={styles.deviceNoteText}>
              Note for Xiaomi, HyperOS, and Oppo users: Turn on "Floating notifications" and "Sound" in your phone's App Notification settings to allow drop-down pop-up banners.
            </Text>
          </View>

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
            onPress={logout}
            variant="destructive"
            style={styles.logoutBtn}
          >
            <LogOut size={18} color="#ffffff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Button>
        </View>
      </ScrollView>
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    marginBottom: 20,
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
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 10,
    gap: 12,
  },
  tilePressed: {
    borderColor: '#6C8EFF',
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
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  setPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
    marginTop: 20,
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
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
    height: 34,
    borderRadius: 6,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadMinutesPillActive: {
    backgroundColor: 'rgba(108,142,255,0.12)',
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
  testBtnPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(108,142,255,0.15)',
    borderWidth: 1,
    borderColor: '#6C8EFF',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C8EFF',
  },
  deviceNoteBox: {
    backgroundColor: '#161A26',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#232A3B',
  },
  deviceNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A99AD',
  },
});

