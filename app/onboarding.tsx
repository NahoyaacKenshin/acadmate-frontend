import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, ScanLine, ArrowRight, Smile, Layers } from 'lucide-react-native';
import { useUserStore, type StudentSet } from '@/src/store/userStore';
import { useTheme } from '@/src/theme/useTheme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { setNickname, setStudentSet, completeOnboarding } = useUserStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedSet, setSelectedSet] = useState<StudentSet>('Standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savePreferences = async () => {
    if (nicknameInput.trim()) {
      await setNickname(nicknameInput.trim());
    }
    await setStudentSet(selectedSet);
    await completeOnboarding(selectedSet);
  };

  const handleScanSchedule = async () => {
    setIsSubmitting(true);
    try {
      await savePreferences();
      router.replace('/(app)/schedule-upload');
    } catch (e) {
      console.error('Failed to save onboarding selections', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartFresh = async () => {
    setIsSubmitting(true);
    try {
      await savePreferences();
      router.replace('/');
    } catch (e) {
      console.error('Failed to save onboarding selections', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconRing,
              {
                backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)',
              },
            ]}
          >
            <Image
              source={require('../assets/images/new-splash-favicon-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome to AcadMate</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your personal academic workspace. Set up your preferences to personalize schedules, notifications, and study notebooks.
          </Text>
        </View>

        {/* Nickname Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Smile size={15} color="#6366F1" />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>What should we call you?</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            This nickname will appear in your daily timeline and greetings.
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. Alex, Kenji, Ate Jess…"
              placeholderTextColor={colors.mutedForeground}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              maxLength={24}
              autoCorrect={false}
            />
            {nicknameInput.trim().length > 0 && (
              <View style={styles.inputCheck}>
                <CheckCircle2 size={18} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* Modality / Schedule Set Selection */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Layers size={15} color="#6366F1" />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Class Modality / Schedule Set</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Choose your schedule set for alternating Face-to-Face and Online classes.
          </Text>

          <View style={styles.setGrid}>
            <Pressable
              style={[
                styles.setCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                selectedSet === 'A' && {
                  borderColor: '#6366F1',
                  backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                },
              ]}
              onPress={() => setSelectedSet('A')}
            >
              <View style={styles.setCardHeader}>
                <Text
                  style={[
                    styles.setName,
                    { color: colors.foreground },
                    selectedSet === 'A' && styles.setNameSelected,
                  ]}
                >
                  Set A
                </Text>
                {selectedSet === 'A' && <CheckCircle2 size={16} color="#6366F1" />}
              </View>
              <Text style={[styles.setDesc, { color: colors.mutedForeground }]}>
                F2F on Set A weeks / Saturdays. Online on Set B.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.setCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                selectedSet === 'B' && {
                  borderColor: '#6366F1',
                  backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                },
              ]}
              onPress={() => setSelectedSet('B')}
            >
              <View style={styles.setCardHeader}>
                <Text
                  style={[
                    styles.setName,
                    { color: colors.foreground },
                    selectedSet === 'B' && styles.setNameSelected,
                  ]}
                >
                  Set B
                </Text>
                {selectedSet === 'B' && <CheckCircle2 size={16} color="#6366F1" />}
              </View>
              <Text style={[styles.setDesc, { color: colors.mutedForeground }]}>
                F2F on Set B weeks / Saturdays. Online on Set A.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.setCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                selectedSet === 'Standard' && {
                  borderColor: '#6366F1',
                  backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                },
              ]}
              onPress={() => setSelectedSet('Standard')}
            >
              <View style={styles.setCardHeader}>
                <Text
                  style={[
                    styles.setName,
                    { color: colors.foreground },
                    selectedSet === 'Standard' && styles.setNameSelected,
                  ]}
                >
                  Standard / Regular
                </Text>
                {selectedSet === 'Standard' && <CheckCircle2 size={16} color="#6366F1" />}
              </View>
              <Text style={[styles.setDesc, { color: colors.mutedForeground }]}>
                Regular recurring timetable with no alternating sets.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action CTAs */}
        <View style={styles.footer}>
          {isSubmitting ? (
            <ActivityIndicator color="#6366F1" style={{ paddingVertical: 20 }} />
          ) : (
            <>
              {/* Primary Action: Scan COR / Syllabus */}
              <TouchableOpacity
                style={styles.primaryScanBtn}
                onPress={handleScanSchedule}
                activeOpacity={0.85}
              >
                <View style={styles.scanBtnIconWrap}>
                  <ScanLine size={20} color="#ffffff" />
                </View>
                <View style={styles.scanBtnTextWrap}>
                  <View style={styles.scanBtnTitleRow}>
                    <Text style={styles.primaryScanBtnTitle}>Scan Certificate of Registration / Syllabus</Text>
                    <View style={styles.aiBadge}>
                      <Image
                        source={require('../assets/images/new-splash-favicon-icon.png')}
                        style={styles.aiBadgeLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.primaryScanBtnSub}>
                    Auto-import classes, rooms, and exam dates from photo or PDF.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Secondary Action: Start Fresh */}
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleStartFresh}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                  Start Fresh (Manual Entry)
                </Text>
                <ArrowRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconRing: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontWeight: '500',
  },
  inputCheck: {
    paddingLeft: 8,
  },
  setGrid: {
    gap: 10,
  },
  setCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  setCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  setName: {
    fontSize: 14,
    fontWeight: '700',
  },
  setNameSelected: {
    color: '#6366F1',
  },
  setDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: 14,
    gap: 10,
  },
  primaryScanBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  scanBtnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBtnTextWrap: {
    flex: 1,
  },
  scanBtnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  primaryScanBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 1,
  },
  primaryScanBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  aiBadgeLogo: {
    width: 12,
    height: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    includeFontPadding: false,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
