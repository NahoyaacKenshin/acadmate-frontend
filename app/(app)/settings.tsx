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
import { Text } from '@/src/components/ui/text';
import { ConfirmModal } from '@/src/components/common/ConfirmModal';
import { useTheme } from '@/src/theme/useTheme';
import { ThemeMode } from '@/src/theme/tokens';
import {
  LogOut,
  User,
  Info,
  Layers,
  Smartphone,
  Check,
  X,
  Pencil,
  BookOpen,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  Calendar,
  Sun,
  Moon,
  SunMoon,
} from 'lucide-react-native';

import { useNotificationStore } from '@/src/store/notificationStore';
import { formatLeadMinutes } from '@/src/services/notificationService';

type ToggleablePref =
  | 'classReminders'
  | 'taskReminders'
  | 'examAlerts'
  | 'studyReminders'
  | 'eventReminders';

interface CustomLeadConfig {
  visible: boolean;
  title: string;
  prefKey:
    | 'classLeadMinutes'
    | 'taskLeadMinutes'
    | 'examLeadMinutes'
    | 'eventLeadMinutes'
    | 'studyLeadMinutes';
  currentMinutes: number;
  allowedUnits: ('minutes' | 'hours' | 'days')[];
}

// ── Lead Time Pills Row ─────────────────────────────────────────────────────

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
  const { colors, isDark } = useTheme();
  const isCustom = !presets.includes(currentMinutes);

  return (
    <View style={styles.leadMinutesRow}>
      {presets.map((mins) => {
        const isSel = currentMinutes === mins;
        return (
          <Pressable
            key={mins}
            style={[
              styles.leadMinutesPill,
              {
                backgroundColor: isSel
                  ? isDark
                    ? 'rgba(99, 102, 241, 0.18)'
                    : '#EEF2FF'
                  : colors.background,
                borderColor: isSel ? '#6366F1' : colors.border,
              },
            ]}
            onPress={() => onSelectPreset(mins)}
          >
            <Text
              style={[
                styles.leadMinutesText,
                { color: isSel ? '#6366F1' : colors.mutedForeground },
                isSel && styles.leadMinutesTextActive,
              ]}
              numberOfLines={1}
            >
              {formatLeadMinutes(mins)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[
          styles.leadMinutesPill,
          {
            backgroundColor: isCustom
              ? isDark
                ? 'rgba(99, 102, 241, 0.18)'
                : '#EEF2FF'
              : colors.background,
            borderColor: isCustom ? '#6366F1' : colors.border,
          },
        ]}
        onPress={onOpenCustom}
      >
        <Text
          style={[
            styles.leadMinutesText,
            { color: isCustom ? '#6366F1' : colors.mutedForeground },
            isCustom && styles.leadMinutesTextActive,
          ]}
          numberOfLines={1}
        >
          {isCustom ? formatLeadMinutes(currentMinutes) : 'Custom'}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Switch Toggle Component ─────────────────────────────────────────────────

function SettingsToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <Pressable
      style={[
        styles.switchTrack,
        {
          backgroundColor: value
            ? '#6366F1'
            : isDark
            ? 'rgba(255, 255, 255, 0.14)'
            : '#E4E4E7',
        },
      ]}
      onPress={onValueChange}
      hitSlop={8}
    >
      <View
        style={[
          styles.switchThumb,
          value && styles.switchThumbActive,
        ]}
      />
    </Pressable>
  );
}

// ── Main Settings Screen ────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, theme, setTheme, colorScheme } = useTheme();
  const { user, logout, isLoading } = useAuthStore();
  const {
    studentSet,
    anchorMonday,
    anchorSet,
    nickname,
    setStudentSet,
    setNickname,
  } = useUserStore();
  const { prefs, updatePrefs } = useNotificationStore();

  const currentActiveSet = useMemo(() => {
    return computeCurrentSet(studentSet, anchorMonday, anchorSet, new Date());
  }, [studentSet, anchorMonday, anchorSet]);

  const flipDateLabel = useMemo(() => {
    const nextFlip = getNextSetFlipMonday(new Date());
    return nextFlip.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Custom Lead Modal state
  const [customLeadConfig, setCustomLeadConfig] = useState<CustomLeadConfig | null>(null);
  const [customValInput, setCustomValInput] = useState('');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  const triggerHaptic = () => {
    try {
      Vibration.vibrate(15);
    } catch {}
  };

  const openCustomModal = (
    title: string,
    prefKey:
      | 'classLeadMinutes'
      | 'taskLeadMinutes'
      | 'examLeadMinutes'
      | 'eventLeadMinutes'
      | 'studyLeadMinutes',
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

  const handleSelectTheme = (mode: ThemeMode) => {
    triggerHaptic();
    setTheme(mode);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Account, academic schedule & preferences
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE',
              },
            ]}
          >
            {userInitials ? (
              <Text style={styles.avatarText}>{userInitials}</Text>
            ) : (
              <User size={22} color="#6366F1" />
            )}
          </View>
          <View style={styles.profileInfo}>
            {isEditingNickname ? (
              <TextInput
                style={[
                  styles.profileNicknameInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: '#6366F1',
                    color: colors.foreground,
                  },
                ]}
                value={nicknameInput}
                onChangeText={setNicknameInput}
                autoFocus
                maxLength={24}
                autoCorrect={false}
                onSubmitEditing={handleSaveNickname}
                returnKeyType="done"
                placeholder="Enter nickname…"
                placeholderTextColor={colors.mutedForeground}
              />
            ) : (
              <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                {nickname || user?.name || (user?.email ? user.email.split('@')[0] : 'AcadMate Student')}
              </Text>
            )}
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user?.email ?? 'No email connected'}
            </Text>
          </View>

          {isEditingNickname ? (
            <View style={styles.editBtnRow}>
              <TouchableOpacity
                style={[
                  styles.cancelActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F4F4F5',
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleCancelNickname}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={14} color={colors.mutedForeground} />
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
              style={[
                styles.editNicknameBtn,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE',
                },
              ]}
              onPress={() => {
                triggerHaptic();
                setNicknameInput(nickname ?? '');
                setIsEditingNickname(true);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={11} color="#6366F1" />
              <Text style={styles.editNicknameBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Appearance & Theme ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Appearance & Theme
          </Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.groupHeaderRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                ]}
              >
                <SunMoon size={18} color="#6366F1" />
              </View>
              <View style={styles.tileContent}>
                <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                  Interface Appearance
                </Text>
                <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                  {theme === 'system'
                    ? `Match phone OS (currently ${colorScheme === 'dark' ? 'Dark' : 'Light'})`
                    : theme === 'dark'
                    ? 'Always Dark mode'
                    : 'Always Light mode'}
                </Text>
              </View>
            </View>

            {/* 3-way Segmented Control */}
            <View
              style={[
                styles.themeSelectorRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F4F5',
                  borderColor: colors.border,
                },
              ]}
            >
              {[
                { mode: 'system' as const, label: 'System', icon: SunMoon },
                { mode: 'light' as const, label: 'Light', icon: Sun },
                { mode: 'dark' as const, label: 'Dark', icon: Moon },
              ].map(({ mode, label, icon: IconComponent }) => {
                const isSelected = theme === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.themePill,
                      isSelected && styles.themePillActive,
                      { flex: 1 },
                    ]}
                    onPress={() => handleSelectTheme(mode)}
                  >
                    <IconComponent
                      size={14}
                      color={isSelected ? '#ffffff' : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.themePillText,
                        { color: isSelected ? '#ffffff' : colors.mutedForeground },
                        isSelected && styles.themePillTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Academic Configuration ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Academic Schedule
          </Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Schedule Modality Header */}
            <View style={styles.groupHeaderRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                ]}
              >
                <Layers size={18} color="#6366F1" />
              </View>
              <View style={styles.tileContent}>
                <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                  Schedule Set Modality
                </Text>
                <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                  {studentSet === 'Standard' || !studentSet
                    ? 'Standard mode (every-week classes)'
                    : `Alternating set (currently Set ${currentActiveSet})`}
                </Text>
              </View>
            </View>

            {/* Set Selector Segmented Control */}
            <View
              style={[
                styles.setSelectorRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F4F5',
                  borderColor: colors.border,
                },
              ]}
            >
              {(['Standard', 'A', 'B'] as const).map((s) => {
                const isSel = studentSet === s;
                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.setPill,
                      isSel && styles.setPillActive,
                      { flex: 1, alignItems: 'center' },
                    ]}
                    onPress={() => handleSetStudentSet(s)}
                  >
                    <Text
                      style={[
                        styles.setPillText,
                        { color: isSel ? '#ffffff' : colors.mutedForeground },
                        isSel && styles.setPillTextActive,
                      ]}
                    >
                      {s === 'Standard' ? 'Standard' : `Set ${s}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Set info badge */}
            <View
              style={[
                styles.setInfoBadge,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E2E8F0',
                },
              ]}
            >
              {studentSet === 'A' || studentSet === 'B' ? (
                <Text style={[styles.setInfoBadgeText, { color: colors.foreground }]}>
                  Active this week:{' '}
                  <Text style={{ fontWeight: '700', color: '#6366F1' }}>Set {currentActiveSet}</Text>
                  {' • '}Flips to Set {currentActiveSet === 'A' ? 'B' : 'A'} on {flipDateLabel}
                </Text>
              ) : (
                <Text style={[styles.setInfoBadgeText, { color: colors.mutedForeground }]}>
                  Standard mode displays only classes scheduled for every week.
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Preferences & Notifications ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Notifications & Alerts
          </Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* 1. Class Reminders */}
            <View style={styles.prefTile}>
              <View style={styles.tileMainRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
                  ]}
                >
                  <BookOpen size={18} color="#3B82F6" />
                </View>
                <View style={styles.tileContent}>
                  <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                    Class Reminders
                  </Text>
                  <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                    {prefs.classReminders
                      ? `Active (${formatLeadMinutes(prefs.classLeadMinutes)} before)`
                      : 'Disabled'}
                  </Text>
                </View>
                <SettingsToggle
                  value={prefs.classReminders}
                  onValueChange={() => handleTogglePref('classReminders')}
                />
              </View>

              {prefs.classReminders && (
                <View style={styles.leadMinutesContainer}>
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
                </View>
              )}
            </View>

            <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

            {/* 2. Task Due Alerts */}
            <View style={styles.prefTile}>
              <View style={styles.tileMainRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
                  ]}
                >
                  <CheckSquare size={18} color="#10B981" />
                </View>
                <View style={styles.tileContent}>
                  <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                    Task Due Alerts
                  </Text>
                  <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                    {prefs.taskReminders
                      ? `Active (${formatLeadMinutes(prefs.taskLeadMinutes)} before)`
                      : 'Disabled'}
                  </Text>
                </View>
                <SettingsToggle
                  value={prefs.taskReminders}
                  onValueChange={() => handleTogglePref('taskReminders')}
                />
              </View>

              {prefs.taskReminders && (
                <View style={styles.leadMinutesContainer}>
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
                </View>
              )}
            </View>

            <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

            {/* 3. Exam Schedule Alerts */}
            <View style={styles.prefTile}>
              <View style={styles.tileMainRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' },
                  ]}
                >
                  <AlertTriangle size={18} color="#F59E0B" />
                </View>
                <View style={styles.tileContent}>
                  <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                    Exam Schedule Alerts
                  </Text>
                  <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                    {prefs.examAlerts
                      ? `Active (${formatLeadMinutes(prefs.examLeadMinutes)} before)`
                      : 'Disabled'}
                  </Text>
                </View>
                <SettingsToggle
                  value={prefs.examAlerts}
                  onValueChange={() => handleTogglePref('examAlerts')}
                />
              </View>

              {prefs.examAlerts && (
                <View style={styles.leadMinutesContainer}>
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
                </View>
              )}
            </View>

            <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

            {/* 4. Notebook Study Reminders */}
            <View style={styles.prefTile}>
              <View style={styles.tileMainRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF' },
                  ]}
                >
                  <Sparkles size={18} color="#8B5CF6" />
                </View>
                <View style={styles.tileContent}>
                  <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                    Study Session Reminders
                  </Text>
                  <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                    {prefs.studyReminders
                      ? `Active (${formatLeadMinutes(prefs.studyLeadMinutes)} before)`
                      : 'Disabled'}
                  </Text>
                </View>
                <SettingsToggle
                  value={prefs.studyReminders}
                  onValueChange={() => handleTogglePref('studyReminders')}
                />
              </View>

              {prefs.studyReminders && (
                <View style={styles.leadMinutesContainer}>
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
                </View>
              )}
            </View>

            <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

            {/* 5. General Event Reminders */}
            <View style={styles.prefTile}>
              <View style={styles.tileMainRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                  ]}
                >
                  <Calendar size={18} color="#6366F1" />
                </View>
                <View style={styles.tileContent}>
                  <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                    General Event Reminders
                  </Text>
                  <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                    {prefs.eventReminders
                      ? `Active (${formatLeadMinutes(prefs.eventLeadMinutes)} before)`
                      : 'Disabled'}
                  </Text>
                </View>
                <SettingsToggle
                  value={prefs.eventReminders}
                  onValueChange={() => handleTogglePref('eventReminders')}
                />
              </View>

              {prefs.eventReminders && (
                <View style={styles.leadMinutesContainer}>
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
                </View>
              )}
            </View>
          </View>

          {/* Device Specific Guidance Card */}
          <View
            style={[
              styles.deviceNoteBox,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#C7D2FE',
              },
            ]}
          >
            <View style={styles.deviceNoteHeader}>
              <Smartphone size={15} color="#6366F1" />
              <Text style={styles.deviceNoteTitle}>Android & HyperOS Optimization Tip</Text>
            </View>
            <Text style={[styles.deviceNoteText, { color: colors.mutedForeground }]}>
              For Xiaomi, HyperOS, and Oppo users: Turn on "Floating notifications" and "Sound" in your phone's App Notification settings to allow drop-down pop-up banners.
            </Text>
          </View>
        </View>

        {/* ── About Section ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            About
          </Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.aboutRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' },
                ]}
              >
                <Info size={18} color="#6366F1" />
              </View>
              <View style={styles.tileContent}>
                <Text style={[styles.tileTitleBold, { color: colors.foreground }]}>
                  AcadMate
                </Text>
                <Text style={[styles.tileValueSub, { color: colors.mutedForeground }]}>
                  Academic study & schedule companion
                </Text>
              </View>
              <Text style={[styles.metaBadgeText, { color: colors.mutedForeground }]}>v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* ── Sign Out Section ── */}
        <View style={styles.footer}>
          <Pressable
            disabled={isLoading}
            onPress={() => {
              triggerHaptic();
              setShowLogoutModal(true);
            }}
            style={({ pressed }) => [
              styles.logoutBtnCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
              },
              pressed && {
                opacity: 0.8,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
              },
            ]}
          >
            <View style={styles.logoutIconWrap}>
              <LogOut size={18} color="#EF4444" />
            </View>
            <Text style={styles.logoutTitle}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
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

      {/* ── Custom Lead Modal ── */}
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
            <View
              style={[
                styles.customModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.customModalHeader}>
                <Text style={[styles.customModalTitle, { color: colors.foreground }]}>
                  {customLeadConfig.title}
                </Text>
                <Pressable
                  onPress={() => setCustomLeadConfig(null)}
                  style={[
                    styles.customModalCloseBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F4F4F5',
                      borderColor: colors.border,
                    },
                  ]}
                  hitSlop={8}
                >
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.customModalSub, { color: colors.mutedForeground }]}>
                Set reminder lead time before starting:
              </Text>

              {/* Number Input & Unit */}
              <View style={styles.customInputRow}>
                <TextInput
                  style={[
                    styles.customNumberInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={customValInput}
                  onChangeText={setCustomValInput}
                  keyboardType="numeric"
                  autoFocus
                  maxLength={5}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View
                  style={[
                    styles.customUnitGroup,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F4F5',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {customLeadConfig.allowedUnits.map((u) => {
                    const isUnitSel = customUnit === u;
                    const label = u === 'minutes' ? 'Min' : u === 'hours' ? 'Hours' : 'Days';
                    return (
                      <Pressable
                        key={u}
                        style={[
                          styles.customUnitBtn,
                          isUnitSel && styles.customUnitBtnActive,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setCustomUnit(u);
                        }}
                      >
                        <Text
                          style={[
                            styles.customUnitText,
                            { color: isUnitSel ? '#ffffff' : colors.mutedForeground },
                            isUnitSel && styles.customUnitTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.customModalActions}>
                <Pressable
                  onPress={() => setCustomLeadConfig(null)}
                  style={[
                    styles.customCancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F4F4F5',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.customCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveCustomLead}
                  style={styles.customSaveBtn}
                >
                  <Text style={styles.customSaveText}>Set Reminder</Text>
                </Pressable>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
  },

  // ── Profile Card ──────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  profileNicknameInput: {
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  editNicknameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editNicknameBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    includeFontPadding: false,
    flexShrink: 0,
  },
  editBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  saveActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section & Card Group ──────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingHorizontal: 2,
    includeFontPadding: false,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileContent: {
    flex: 1,
  },
  tileTitleBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  tileValueSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Appearance & Theme ───────────────────────────────────────────────────
  themeSelectorRow: {
    flexDirection: 'row',
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 3,
    borderWidth: 1,
    gap: 4,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  themePillActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  themePillText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
  },
  themePillTextActive: {
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Schedule Set Modality ─────────────────────────────────────────────────
  setSelectorRow: {
    flexDirection: 'row',
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 3,
    borderWidth: 1,
  },
  setPill: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  setPillActive: {
    backgroundColor: '#6366F1',
  },
  setPillText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
  },
  setPillTextActive: {
    fontWeight: '700',
    color: '#ffffff',
  },
  setInfoBadge: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  setInfoBadgeText: {
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Notification Tiles ────────────────────────────────────────────────────
  prefTile: {
    padding: 16,
  },
  tileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileDivider: {
    height: 1,
    marginLeft: 62,
  },
  leadMinutesContainer: {
    marginTop: 12,
    marginLeft: 50,
  },
  leadMinutesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  leadMinutesPill: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  leadMinutesText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
    flexShrink: 0,
  },
  leadMinutesTextActive: {
    fontWeight: '700',
  },

  // ── Switch Toggle ─────────────────────────────────────────────────────────
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },

  // ── Device Optimization Tip ───────────────────────────────────────────────
  deviceNoteBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    gap: 6,
  },
  deviceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  deviceNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    includeFontPadding: false,
  },
  deviceNoteText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // ── About Rows ────────────────────────────────────────────────────────────
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  // ── Logout Button ─────────────────────────────────────────────────────────
  footer: {
    marginTop: 4,
  },
  logoutBtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // ── Custom Lead Modal ─────────────────────────────────────────────────────
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
    paddingHorizontal: 20,
  },
  customModalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  customModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  customModalSub: {
    fontSize: 13,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customNumberInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
  },
  customUnitGroup: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  customUnitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customUnitBtnActive: {
    backgroundColor: '#6366F1',
  },
  customUnitText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  customUnitTextActive: {
    fontWeight: '700',
    color: '#ffffff',
  },
  customModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  customCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
