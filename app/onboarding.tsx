import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { GraduationCap, CheckCircle2, ScanLine, ArrowRight, Smile, Sparkles, Layers } from 'lucide-react-native';
import { useUserStore, type StudentSet } from '@/src/store/userStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setNickname, setStudentSet, completeOnboarding } = useUserStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedSet, setSelectedSet] = useState<StudentSet>('Standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savePreferences = async () => {
    if (nicknameInput.trim()) {
      await setNickname(nicknameInput.trim());
    }
    await setStudentSet(selectedSet);
    await completeOnboarding();
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconRing}>
            <GraduationCap size={30} color="#6C8EFF" />
          </View>
          <Text style={styles.title}>Welcome to AcadMate</Text>
          <Text style={styles.subtitle}>
            Your personal academic sandbox. Set up your preferences to personalize schedules, notifications, and study notebooks.
          </Text>
        </View>

        {/* Nickname Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Smile size={15} color="#6C8EFF" />
            <Text style={styles.sectionLabel}>What should we call you?</Text>
          </View>
          <Text style={styles.sectionDesc}>
            This nickname will appear in your daily timeline and greetings.
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex, Kenji, Ate Jess…"
              placeholderTextColor="#4A5568"
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
            <Layers size={15} color="#6C8EFF" />
            <Text style={styles.sectionLabel}>Class Modality / Schedule Set</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Choose your schedule set for alternating Face-to-Face and Online classes.
          </Text>

          <View style={styles.setGrid}>
            <Pressable
              style={[
                styles.setCard,
                selectedSet === 'A' && styles.setCardSelected,
              ]}
              onPress={() => setSelectedSet('A')}
            >
              <View style={styles.setCardHeader}>
                <Text style={[styles.setName, selectedSet === 'A' && styles.setNameSelected]}>
                  Set A
                </Text>
                {selectedSet === 'A' && <CheckCircle2 size={16} color="#6C8EFF" />}
              </View>
              <Text style={styles.setDesc}>
                F2F on Set A weeks / Saturdays. Online on Set B.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.setCard,
                selectedSet === 'B' && styles.setCardSelected,
              ]}
              onPress={() => setSelectedSet('B')}
            >
              <View style={styles.setCardHeader}>
                <Text style={[styles.setName, selectedSet === 'B' && styles.setNameSelected]}>
                  Set B
                </Text>
                {selectedSet === 'B' && <CheckCircle2 size={16} color="#6C8EFF" />}
              </View>
              <Text style={styles.setDesc}>
                F2F on Set B weeks / Saturdays. Online on Set A.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.setCard,
                selectedSet === 'Standard' && styles.setCardSelected,
              ]}
              onPress={() => setSelectedSet('Standard')}
            >
              <View style={styles.setCardHeader}>
                <Text style={[styles.setName, selectedSet === 'Standard' && styles.setNameSelected]}>
                  Standard / Regular
                </Text>
                {selectedSet === 'Standard' && <CheckCircle2 size={16} color="#6C8EFF" />}
              </View>
              <Text style={styles.setDesc}>
                Regular recurring timetable with no alternating sets.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action CTAs */}
        <View style={styles.footer}>
          {isSubmitting ? (
            <ActivityIndicator color="#6C8EFF" style={{ paddingVertical: 20 }} />
          ) : (
            <>
              {/* Primary Action: Scan COR / Syllabus */}
              <TouchableOpacity
                style={styles.primaryScanBtn}
                onPress={handleScanSchedule}
                activeOpacity={0.8}
              >
                <View style={styles.scanBtnIconWrap}>
                  <ScanLine size={20} color="#ffffff" />
                </View>
                <View style={styles.scanBtnTextWrap}>
                  <View style={styles.scanBtnTitleRow}>
                    <Text style={styles.primaryScanBtnTitle}>Scan Certificate of Registration / Syllabus</Text>
                    <View style={styles.aiBadge}>
                      <Sparkles size={10} color="#6C8EFF" />
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
                style={styles.secondaryBtn}
                onPress={handleStartFresh}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>Start Fresh (Manual Entry)</Text>
                <ArrowRight size={16} color="#94A3B8" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.25)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  inputCheck: {
    paddingLeft: 8,
  },
  setGrid: {
    gap: 8,
  },
  setCard: {
    backgroundColor: '#161A26',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  setCardSelected: {
    borderColor: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.08)',
  },
  setCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  setName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  setNameSelected: {
    color: '#6C8EFF',
  },
  setDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footer: {
    marginTop: 10,
    gap: 10,
  },
  primaryScanBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanBtnIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnTextWrap: {
    flex: 1,
  },
  scanBtnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  primaryScanBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  primaryScanBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 15,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C8EFF',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
