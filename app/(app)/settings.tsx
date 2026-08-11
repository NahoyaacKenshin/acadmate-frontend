import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
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
  ShieldAlert,
  GraduationCap,
  Smile,
  ChevronRight,
  Check,
  X,
} from 'lucide-react-native';

import { useProgramMappings } from '@/src/hooks/useProgramMappings';
import { AdminApiService } from '@/src/services/admin.api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const { programName, studentSet, nickname, setProgram, setStudentSet, setNickname } = useUserStore();
  const { programMappings: localMappings, isLoading: isMappingsLoading } = useProgramMappings();
  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [apiMappings, setApiMappings] = React.useState<{ id: string; program_name: string; student_set: 'A' | 'B' }[]>([]);

  React.useEffect(() => {
    async function fetchApiPrograms() {
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
        console.error('Failed to fetch fallback program mappings in settings', err);
      }
    }
    fetchApiPrograms();
  }, []);

  const programMappings = localMappings.length > 0 ? localMappings : apiMappings;
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <View style={styles.container}>
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
            {isAdmin && (
              <View style={styles.adminBadge}>
                <ShieldAlert size={12} color="#F59E0B" />
                <Text style={styles.adminBadgeText}>System Administrator</Text>
              </View>
            )}
          </View>
        </View>

        {/* Academic Configuration (Students Only) */}
        {!isAdmin && (
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

            {/* Program Picker Tile */}
            <Pressable
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => setIsProgramModalOpen(true)}
            >
              <GraduationCap size={20} color="#6C8EFF" />
              <View style={styles.tileContent}>
                <Text style={styles.tileTitle}>Degree Program</Text>
                <Text style={styles.tileValue}>{programName ?? 'Not Selected'}</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </Pressable>
          </View>
        )}

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences</Text>

          <View style={styles.tile}>
            <Bell size={20} color="#6C8EFF" />
            <Text style={styles.tileTitleFlex}>Push Notifications</Text>
            <Text style={styles.tileValueSub}>Enabled</Text>
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

      {/* Program Selector Modal */}
      <Modal visible={isProgramModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Degree Program</Text>
              <Pressable onPress={() => setIsProgramModalOpen(false)}>
                <X size={20} color="#94A3B8" />
              </Pressable>
            </View>
            {programMappings.length === 0 ? (
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                No programs configured by Admin yet.
              </Text>
            ) : (
              programMappings.map((prog) => {
                const isSelected = programName?.toUpperCase() === prog.program_name.toUpperCase();
                return (
                  <Pressable
                    key={prog.id || prog.program_name}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setProgram(prog.program_name, prog.student_set);
                      setIsProgramModalOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {prog.program_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Assigned to Set {prog.student_set}</Text>
                    </View>
                    {isSelected && <Check size={18} color="#6C8EFF" />}
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
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
    borderRadius: 14,
    padding: 16,
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
    fontSize: 13,
    color: '#94A3B8',
  },
  tileTitleFlex: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  tileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  nicknameInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6C8EFF',
    marginTop: 2,
    padding: 0,
  },
  editPill: {
    backgroundColor: 'rgba(108,142,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.3)',
  },
  editPillText: {
    fontSize: 12,
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
  adminTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.3)',
    gap: 12,
  },
  adminTilePressed: {
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  adminTileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  adminTileSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(108,142,255,0.12)',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalItemTextSelected: {
    color: '#6C8EFF',
  },
});
