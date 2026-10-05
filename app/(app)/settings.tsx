import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Vibration,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useUserStore, computeCurrentSet, getNextSetFlipMonday } from '@/src/store/userStore';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import {
  LogOut,
  User,
  Bell,
  Info,
  Layers,
  Smartphone,
  Check,
  X,
  Pencil,
} from 'lucide-react-native';

import { useNotificationStore, NotificationPrefs } from '@/src/store/notificationStore';
import { formatLeadMinutes } from '@/src/services/notificationService';

type ToggleablePref = 'classReminders' | 'taskReminders' | 'examAlerts' | 'studyReminders' | 'eventReminders';

interface CustomLeadConfig {
  visible: boolean;
  title: string;
  prefKey: 'classLeadMinutes' | 'taskLeadMinutes' | 'examLeadMinutes' | 'eventLeadMinutes' | 'studyLeadMinutes';
  currentMinutes: number;
  allowedUnits: ('minutes' | 'hours' | 'days')[];
}

function LeadPillsRow({
  presets,
  currentMinutes,
  onSelectPreset,
  onOpenCustom,
}: {
  presets: number[];
  currentMinutes: number;
  onSelectPreset: (mins: number) => void;
  onOpenCustom: () => void;
}) {
  const isCustom = !presets.includes(currentMinutes);

  return (
    <View style={styles.leadMinutesRow}>
      {presets.map((mins) => {
        const isSel = currentMinutes === mins;
        return (
          <Pressable
            key={mins}
            style={[styles.leadMinutesPill, isSel && styles.leadMinutesPillActive]}
            onPress={() => onSelectPreset(mins)}
          >
            <Text style={[styles.leadMinutesText, isSel && styles.leadMinutesTextActive]}>
              {formatLeadMinutes(mins)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.leadMinutesPill, isCustom && styles.leadMinutesPillActive]}
        onPress={onOpenCustom}
      >
        <Text style={[styles.leadMinutesText, isCustom && styles.leadMinutesTextActive]}>
          {isCustom ? formatLeadMinutes(currentMinutes) : 'Custom'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const { studentSet, anchorMonday, anchorSet, nickname, setStudentSet, setNickname } = useUserStore();
  const { prefs, updatePrefs } = useNotificationStore();

  const currentActiveSet = useMemo(() => {
    return computeCurrentSet(studentSet, anchorMonday, anchorSet, new Date());
  }, [studentSet, anchorMonday, anchorSet]);

  const flipDateLabel = useMemo(() => {
    const nextFlip = getNextSetFlipMonday(new Date());
    return nextFlip.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Custom Lead Modal state
  const [customLeadConfig, setCustomLeadConfig] = useState<CustomLeadConfig | null>(null);
  const [customValInput, setCustomValInput] = useState('');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  const openCustomModal = (
    title: string,
    prefKey: 'classLeadMinutes' | 'taskLeadMinutes' | 'examLeadMinutes' | 'eventLeadMinutes' | 'studyLeadMinutes',
    currentMinutes: number,
    allowedUnits: ('minutes' | 'hours' | 'days')[] = ['minutes', 'hours']
  ) => {
    triggerHaptic();
    let initialUnit: 'minutes' | 'hours' | 'days' = 'minutes';
    let initialVal = currentMinutes.toString();

    if (allowedUnits.includes('days') && currentMinutes >= 1440 && currentMinutes % 1440 === 0) {
      initialUnit = 'days';
      initialVal = (currentMinutes / 1440).toString();
    } else if (allowedUnits.includes('hours') && currentMinutes >= 60 && currentMinutes % 60 === 0) {
      initialUnit = 'hours';
      initialVal = (currentMinutes / 60).toString();
    }

    setCustomValInput(initialVal);
    setCustomUnit(initialUnit);
    setCustomLeadConfig({
      visible: true,
      title,
      prefKey,
      currentMinutes,
      allowedUnits,
    });
  };

  const handleSaveCustomLead = () => {
    triggerHaptic();
    if (!customLeadConfig) return;
    const num = parseInt(customValInput.trim(), 10);
    if (isNaN(num) || num < 0) return;

    let totalMinutes = num;
    if (customUnit === 'days') totalMinutes = num * 1440;
    else if (customUnit === 'hours') totalMinutes = num * 60;

    updatePrefs({ [customLeadConfig.prefKey]: totalMinutes });
    setCustomLeadConfig(null);
  };

  // Compute 2-letter user initials for avatar
  const displayName = nickname || user?.name || (user?.email ? user.email.split('@')[0] : '');
  const userInitials = useMemo(() => {
    if (!displayName) return null;
    const parts = displayName.trim().split(/[\s._-]+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [displayName]);

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
            {isEditingNickname ? (
              <TextInput
                style={styles.profileNicknameInput}
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
              <Text style={styles.profileName} numberOfLines={1}>
                {nickname || user?.name || (user?.email ? user.email.split('@')[0] : 'AcadMate Student')}
              </Text>
            )}
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? 'No email'}
            </Text>
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
            <TouchableOpacity
              style={styles.editNicknameBtn}
              onPress={() => {
                triggerHaptic();
                setNicknameInput(nickname ?? '');
                setIsEditingNickname(true);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={11} color="#6C8EFF" />
              <Text style={styles.editNicknameBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Academic Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Academic Configuration</Text>

          {/* Schedule Modality / Set Tile */}
          <View style={styles.tile}>
            <Layers size={20} color="#6C8EFF" />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitle}>Schedule Set</Text>
              <Text style={styles.tileValue}>
                {studentSet === 'Standard' || !studentSet
                  ? 'Standard (Every-week classes only)'
                  : `Currently Set ${currentActiveSet} (Alternating)`}
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

          {studentSet === 'A' || studentSet === 'B' ? (
            <View style={styles.setInfoBadge}>
              <Text style={styles.setInfoBadgeText}>
                Active this week: <Text style={{ fontWeight: '700', color: '#6C8EFF' }}>Set {currentActiveSet}</Text> • Flips to Set {currentActiveSet === 'A' ? 'B' : 'A'} on {flipDateLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.setInfoBadge}>
              <Text style={styles.setInfoBadgeText}>
                Standard mode displays only classes scheduled for every week.
              </Text>
            </View>
          )}
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
                {prefs.classReminders ? `Active (${formatLeadMinutes(prefs.classLeadMinutes)} before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.classReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.classReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Class Lead Time Option: Presets + Custom */}
          {prefs.classReminders && (
            <LeadPillsRow
              presets={[5, 10, 15, 30]}
              currentMinutes={prefs.classLeadMinutes}
              onSelectPreset={(mins) => {
                triggerHaptic();
                handleLeadMinutes(mins);
              }}
              onOpenCustom={() =>
                openCustomModal('Class Reminder Time', 'classLeadMinutes', prefs.classLeadMinutes, ['minutes', 'hours'])
              }
            />
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
                {prefs.taskReminders ? `Active (${formatLeadMinutes(prefs.taskLeadMinutes)} before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.taskReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.taskReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Task Lead Time Option: Presets + Custom */}
          {prefs.taskReminders && (
            <LeadPillsRow
              presets={[30, 60, 180, 1440]}
              currentMinutes={prefs.taskLeadMinutes}
              onSelectPreset={(mins) => {
                triggerHaptic();
                updatePrefs({ taskLeadMinutes: mins });
              }}
              onOpenCustom={() =>
                openCustomModal('Task Due Alert Time', 'taskLeadMinutes', prefs.taskLeadMinutes, ['minutes', 'hours', 'days'])
              }
            />
          )}

          {/* Exam Alerts Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('examAlerts')}
          >
            <Bell size={20} color={prefs.examAlerts ? '#F59E0B' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Exam Schedule Alerts</Text>
              <Text style={styles.tileValueSub}>
                {prefs.examAlerts ? `Active (${formatLeadMinutes(prefs.examLeadMinutes)} before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.examAlerts && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.examAlerts && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Exam Lead Time Option: Presets + Custom */}
          {prefs.examAlerts && (
            <LeadPillsRow
              presets={[60, 180, 1440, 2880]}
              currentMinutes={prefs.examLeadMinutes}
              onSelectPreset={(mins) => {
                triggerHaptic();
                updatePrefs({ examLeadMinutes: mins });
              }}
              onOpenCustom={() =>
                openCustomModal('Exam Alert Time', 'examLeadMinutes', prefs.examLeadMinutes, ['hours', 'days'])
              }
            />
          )}

          {/* Study Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('studyReminders')}
          >
            <Bell size={20} color={prefs.studyReminders ? '#A78BFA' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>Notebook Study Reminders</Text>
              <Text style={styles.tileValueSub}>
                {prefs.studyReminders ? `Active (${formatLeadMinutes(prefs.studyLeadMinutes)} before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.studyReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.studyReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Study Lead Time Option: Presets + Custom */}
          {prefs.studyReminders && (
            <LeadPillsRow
              presets={[0, 15, 30, 60]}
              currentMinutes={prefs.studyLeadMinutes}
              onSelectPreset={(mins) => {
                triggerHaptic();
                updatePrefs({ studyLeadMinutes: mins });
              }}
              onOpenCustom={() =>
                openCustomModal('Study Session Reminder', 'studyLeadMinutes', prefs.studyLeadMinutes, ['minutes', 'hours'])
              }
            />
          )}

          {/* General Event Reminders Toggle */}
          <Pressable
            style={styles.tile}
            onPress={() => handleTogglePref('eventReminders')}
          >
            <Bell size={20} color={prefs.eventReminders ? '#F59E0B' : '#94A3B8'} />
            <View style={styles.tileContent}>
              <Text style={styles.tileTitleFlex}>General Event Reminders</Text>
              <Text style={styles.tileValueSub}>
                {prefs.eventReminders ? `Active (${formatLeadMinutes(prefs.eventLeadMinutes)} before)` : 'Disabled'}
              </Text>
            </View>
            <View style={[styles.switchTrack, prefs.eventReminders && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, prefs.eventReminders && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Event Lead Time Option: Presets + Custom */}
          {prefs.eventReminders && (
            <LeadPillsRow
              presets={[10, 15, 30, 60]}
              currentMinutes={prefs.eventLeadMinutes}
              onSelectPreset={(mins) => {
                triggerHaptic();
                updatePrefs({ eventLeadMinutes: mins });
              }}
              onOpenCustom={() =>
                openCustomModal('Event Reminder Time', 'eventLeadMinutes', prefs.eventLeadMinutes, ['minutes', 'hours', 'days'])
              }
            />
          )}

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

      {/* Custom Lead Modal */}
      {customLeadConfig && (
        <Modal
          visible={customLeadConfig.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setCustomLeadConfig(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCustomLeadConfig(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.customModalContainer}
          >
            <View style={styles.customModalCard}>
              <View style={styles.customModalHeader}>
                <Text style={styles.customModalTitle}>{customLeadConfig.title}</Text>
                <Pressable
                  onPress={() => setCustomLeadConfig(null)}
                  style={styles.customModalCloseBtn}
                  hitSlop={8}
                >
                  <X size={18} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.customModalSub}>Set reminder lead time before starting:</Text>

              {/* Number Input & Unit */}
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customNumberInput}
                  value={customValInput}
                  onChangeText={setCustomValInput}
                  keyboardType="numeric"
                  autoFocus
                  maxLength={5}
                  placeholder="0"
                  placeholderTextColor="#475569"
                />
                <View style={styles.customUnitGroup}>
                  {customLeadConfig.allowedUnits.map((u) => {
                    const isUnitSel = customUnit === u;
                    const label = u === 'minutes' ? 'Min' : u === 'hours' ? 'Hours' : 'Days';
                    return (
                      <Pressable
                        key={u}
                        style={[styles.customUnitBtn, isUnitSel && styles.customUnitBtnActive]}
                        onPress={() => {
                          triggerHaptic();
                          setCustomUnit(u);
                        }}
                      >
                        <Text style={[styles.customUnitText, isUnitSel && styles.customUnitTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.customModalActions}>
                <Button
                  variant="outline"
                  onPress={() => setCustomLeadConfig(null)}
                  style={styles.customActionBtn}
                >
                  <Text style={styles.customCancelText}>Cancel</Text>
                </Button>
                <Button
                  onPress={handleSaveCustomLead}
                  style={[styles.customActionBtn, styles.customSaveBtn]}
                >
                  <Text style={styles.customSaveText}>Set Reminder</Text>
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
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
  editNicknameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.25)',
  },
  editNicknameBtnText: {
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
  profileNicknameInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#0F131D',
    borderWidth: 1,
    borderColor: '#6C8EFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
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
  setInfoBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#232A3B',
  },
  setInfoBadgeText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8A99AD',
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
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  customModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  customModalCard: {
    width: '100%',
    backgroundColor: '#161B26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 20,
    gap: 14,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  customModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E2433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customModalSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customNumberInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0F131D',
    borderWidth: 1,
    borderColor: '#6C8EFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  customUnitGroup: {
    flexDirection: 'row',
    backgroundColor: '#0F131D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 3,
    gap: 2,
  },
  customUnitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 7,
  },
  customUnitBtnActive: {
    backgroundColor: '#6C8EFF',
  },
  customUnitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  customUnitTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  customActionBtn: {
    flex: 1,
    height: 42,
  },
  customSaveBtn: {
    backgroundColor: '#6C8EFF',
  },
  customCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  customSaveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
