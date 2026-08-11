import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { GraduationCap, CheckCircle2, ChevronRight, Smile } from 'lucide-react-native';
import { useUserStore } from '@/src/store/userStore';
import { useProgramMappings } from '@/src/hooks/useProgramMappings';
import { AdminApiService } from '@/src/services/admin.api';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setProgram, setNickname, completeOnboarding } = useUserStore();
  const { programMappings: localMappings, isLoading: isHookLoading } = useProgramMappings();
  const [apiMappings, setApiMappings] = useState<{ id: string; program_name: string; student_set: 'A' | 'B' }[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  useEffect(() => {
    async function fetchApiPrograms() {
      setIsLoadingApi(true);
      try {
        const res = await AdminApiService.listProgramMappings();
        if (res?.data && Array.isArray(res.data)) {
          setApiMappings(
            res.data.map((m: any) => ({
              id: m.id,
              program_name: m.programName,
              student_set: m.studentSet,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch fallback program mappings', err);
      } finally {
        setIsLoadingApi(false);
      }
    }
    fetchApiPrograms();
  }, []);

  const programMappings = localMappings.length > 0 ? localMappings : apiMappings;
  const isLoading = isHookLoading && isLoadingApi;

  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<'A' | 'B'>('A');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select first program when programMappings are loaded
  useEffect(() => {
    if (programMappings.length > 0 && !selectedProgram) {
      setSelectedProgram(programMappings[0].program_name);
      setSelectedSet(programMappings[0].student_set);
    }
  }, [programMappings, selectedProgram]);

  // Auto-resolve set when program selection changes
  useEffect(() => {
    if (!selectedProgram) return;
    const mapping = programMappings.find(
      (m) => m.program_name.toUpperCase() === selectedProgram.toUpperCase()
    );
    if (mapping) {
      setSelectedSet(mapping.student_set);
    }
  }, [selectedProgram, programMappings]);

  const handleFinish = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);
    try {
      await setProgram(selectedProgram, selectedSet);
      if (nicknameInput.trim()) {
        await setNickname(nicknameInput.trim());
      }
      await completeOnboarding();
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
            <GraduationCap size={32} color="#6C8EFF" />
          </View>
          <Text style={styles.title}>Welcome to AcadMate</Text>
          <Text style={styles.subtitle}>
            Set up your profile in seconds — your schedule, calendar, and reminders will be personalized just for you.
          </Text>
        </View>

        {/* Nickname Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Smile size={15} color="#6C8EFF" />
            <Text style={styles.sectionLabel}>What should we call you?</Text>
          </View>
          <Text style={styles.sectionDesc}>
            This nickname will appear in your greetings and throughout the app.
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex, Kenz, Ate Jess…"
              placeholderTextColor="#4A5568"
              value={nicknameInput}
              onChangeText={setNicknameInput}
              maxLength={24}
              autoCorrect={false}
            />
            {nicknameInput.length > 0 && (
              <View style={styles.inputCheck}>
                <CheckCircle2 size={18} color="#10B981" />
              </View>
            )}
          </View>
          {nicknameInput.length === 0 && (
            <Text style={styles.inputHint}>Optional — you can add this later in Settings.</Text>
          )}
        </View>

        {/* Program Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <GraduationCap size={15} color="#6C8EFF" />
            <Text style={styles.sectionLabel}>Select Your Degree Program</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#6C8EFF" style={{ marginVertical: 20 }} />
          ) : programMappings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                No academic programs configured by Admin yet. You can set your program later in Settings.
              </Text>
            </View>
          ) : (
            <View style={styles.programGrid}>
              {programMappings.map((prog) => {
                const isSelected = selectedProgram.toUpperCase() === prog.program_name.toUpperCase();
                return (
                  <Pressable
                    key={prog.id || prog.program_name}
                    style={[
                      styles.programCard,
                      isSelected && styles.programCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedProgram(prog.program_name);
                      setSelectedSet(prog.student_set);
                    }}
                  >
                    <View style={styles.programCardHeader}>
                      <Text
                        style={[
                          styles.programName,
                          isSelected && styles.programNameSelected,
                        ]}
                      >
                        {prog.program_name}
                      </Text>
                      {isSelected && <CheckCircle2 size={18} color="#6C8EFF" />}
                    </View>
                    <Text style={styles.programDesc} numberOfLines={2}>
                      Schedule Set {prog.student_set} · Auto-assigned by Admin
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.footer}>
          <Button
            style={[styles.submitBtn, !selectedProgram && styles.submitBtnDisabled]}
            disabled={isSubmitting || (!selectedProgram && programMappings.length > 0)}
            onPress={handleFinish}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>
                  {nicknameInput.trim()
                    ? `Let's go, ${nicknameInput.trim()}! 🎉`
                    : "Continue to AcadMate"}
                </Text>
                <ChevronRight size={18} color="#ffffff" />
              </View>
            )}
          </Button>
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
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A3143',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  inputCheck: {
    paddingLeft: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 6,
    marginLeft: 4,
  },
  emptyBox: {
    padding: 16,
    backgroundColor: '#161A26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  emptyBoxText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  programGrid: {
    gap: 10,
  },
  programCard: {
    backgroundColor: '#161A26',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#2A3143',
  },
  programCardSelected: {
    borderColor: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.08)',
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  programName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  programNameSelected: {
    color: '#6C8EFF',
  },
  programDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footer: {
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
