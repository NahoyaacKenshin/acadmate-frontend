import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '@/src/components/ui/text';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Camera,
  X,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Calendar,
  AlertCircle,
  WifiOff,
  BookOpen,
} from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSystemStore } from '@/src/store/systemStore';
import { SubjectRow } from '@/src/hooks/useSubjects';
import { useTaskScanner, ParsedScannedTask } from '@/src/hooks/useTaskScanner';
import { NotificationService } from '@/src/services/notificationService';
import { formatDateTimePHT, toPhilippineISO } from '@/src/utils/philippineTime';

interface TaskScanModalProps {
  visible: boolean;
  subjects: SubjectRow[];
  onClose: () => void;
}

export function TaskScanModal({ visible, subjects, onClose }: TaskScanModalProps) {
  const powerSync = usePowerSync();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useSystemStore((s) => s.isOnline);

  const {
    selectedFile,
    isLoading,
    error,
    isRetryable,
    pickDocument,
    pickFromGallery,
    pickFromCamera,
    clearFile,
    clearError,
    cancelUpload,
    uploadAndScan,
  } = useTaskScanner();

  // Review step state
  const [scannedTasks, setScannedTasks] = useState<ParsedScannedTask[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [openSubjectDropdownId, setOpenSubjectDropdownId] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) {
      cancelUpload();
    }
    clearFile();
    clearError();
    setScannedTasks(null);
    setIsImporting(false);
    setOpenSubjectDropdownId(null);
    onClose();
  };

  const handleStartScan = async () => {
    const results = await uploadAndScan(subjects);
    if (results && results.length > 0) {
      // Auto-match subjects by name if subjectId wasn't set by Gemini
      const enhanced = results.map((t) => {
        if (!t.subjectId && t.subjectName) {
          const lowerName = t.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matched = subjects.find((s) => {
            const sLower = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return sLower.includes(lowerName) || lowerName.includes(sLower);
          });
          if (matched) {
            return { ...t, subjectId: matched.id };
          }
        }
        return t;
      });
      setScannedTasks(enhanced);
    }
  };

  const handleToggleSelectTask = (tempId: string) => {
    if (!scannedTasks) return;
    setScannedTasks((prev) =>
      prev ? prev.map((t) => (t.tempId === tempId ? { ...t, selected: !t.selected } : t)) : null
    );
  };

  const handleToggleSelectAll = () => {
    if (!scannedTasks) return;
    const allSelected = scannedTasks.every((t) => t.selected);
    setScannedTasks((prev) => (prev ? prev.map((t) => ({ ...t, selected: !allSelected })) : null));
  };

  const handleUpdateTaskTitle = (tempId: string, title: string) => {
    setScannedTasks((prev) =>
      prev ? prev.map((t) => (t.tempId === tempId ? { ...t, title } : t)) : null
    );
  };

  const handleSelectSubject = (tempId: string, subjectId: string | null) => {
    setScannedTasks((prev) =>
      prev ? prev.map((t) => (t.tempId === tempId ? { ...t, subjectId } : t)) : null
    );
    setOpenSubjectDropdownId(null);
  };

  const handleDeleteTask = (tempId: string) => {
    setScannedTasks((prev) => (prev ? prev.filter((t) => t.tempId !== tempId) : null));
  };

  const handleImport = async () => {
    if (!scannedTasks || !userId) return;
    const tasksToImport = scannedTasks.filter((t) => t.selected);
    if (tasksToImport.length === 0) return;

    setIsImporting(true);

    try {
      const now = toPhilippineISO(new Date());

      for (const t of tasksToImport) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const dueDateIso = t.dueDate || null;
        const matchedSub = subjects.find((s) => s.id === t.subjectId);
        const color = matchedSub?.color ?? '#6C8EFF';

        await powerSync.execute(
          `INSERT INTO Task (id, title, description, dueDate, completed, color, subtasks, subjectId, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 0, ?, '[]', ?, ?, ?, ?)`,
          [id, t.title.trim(), t.description || null, dueDateIso, color, t.subjectId || null, userId, now, now]
        );

        if (dueDateIso) {
          NotificationService.scheduleTaskReminders({
            id,
            title: t.title.trim(),
            description: t.description || null,
            due_date: dueDateIso,
            completed: 0,
            color,
            subtasks: '[]',
            subject_id: t.subjectId || null,
            user_id: userId,
            created_at: now,
            updated_at: now,
            subject_name: matchedSub?.name ?? null,
            subject_color: matchedSub?.color ?? null,
          }).catch((err) => console.warn('[TaskScanModal] scheduleTaskReminders error:', err));
        }
      }

      handleClose();
    } catch (err) {
      console.error('[TaskScanModal] Batch import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = scannedTasks ? scannedTasks.filter((t) => t.selected).length : 0;
  const isAllSelected = scannedTasks ? scannedTasks.length > 0 && scannedTasks.every((t) => t.selected) : false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Sparkles size={18} color="#6C8EFF" />
            </View>
            <Text style={styles.headerTitle}>
              {scannedTasks ? 'Review Detected Tasks' : 'AI Task Scanner'}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
            <X size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color="#F59E0B" />
            <Text style={styles.offlineText}>
              You're offline. Reconnect to scan documents with AI.
            </Text>
          </View>
        )}

        {/* ─── STEP 1: PICK FILE & SCAN ─────────────────────────────────────────── */}
        {!scannedTasks && (
          <View>
            <Text style={styles.subtext}>
              Upload a syllabus, assignment rubric, whiteboard photo, or portal screenshot to auto-detect tasks.
            </Text>

            {/* Picker Cards */}
            <View style={styles.pickerRow}>
              <Pressable
                style={[styles.pickerCard, (!isOnline || isLoading) && styles.disabledCard]}
                onPress={pickDocument}
                disabled={!isOnline || isLoading}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#EF44441A' }]}>
                  <FileText size={22} color="#EF4444" />
                </View>
                <Text style={styles.pickerLabel}>PDF / Word</Text>
                <Text style={styles.pickerSub}>Syllabus, doc</Text>
              </Pressable>

              <Pressable
                style={[styles.pickerCard, (!isOnline || isLoading) && styles.disabledCard]}
                onPress={pickFromGallery}
                disabled={!isOnline || isLoading}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#8B5CF61A' }]}>
                  <ImageIcon size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.pickerLabel}>Gallery</Text>
                <Text style={styles.pickerSub}>Screenshot</Text>
              </Pressable>

              <Pressable
                style={[styles.pickerCard, (!isOnline || isLoading) && styles.disabledCard]}
                onPress={pickFromCamera}
                disabled={!isOnline || isLoading}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#22C55E1A' }]}>
                  <Camera size={22} color="#22C55E" />
                </View>
                <Text style={styles.pickerLabel}>Camera</Text>
                <Text style={styles.pickerSub}>Take photo</Text>
              </Pressable>
            </View>

            {/* Selected File Card */}
            {selectedFile && (
              <View style={styles.fileCard}>
                <View style={styles.fileIconWrap}>
                  <FileText size={18} color="#6C8EFF" />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                  {selectedFile.size && (
                    <Text style={styles.fileSize}>
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </Text>
                  )}
                </View>
                {!isLoading && (
                  <Pressable onPress={clearFile} hitSlop={8}>
                    <X size={16} color="#64748B" />
                  </Pressable>
                )}
              </View>
            )}

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Scan Action / Loading */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#6C8EFF" />
                <Text style={styles.loadingText}>Gemini AI is analyzing your document…</Text>
                <Pressable onPress={cancelUpload} style={styles.cancelScanBtn}>
                  <Text style={styles.cancelScanText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.ctaButton,
                  (!selectedFile || !isOnline) && styles.ctaDisabled,
                ]}
                onPress={handleStartScan}
                disabled={!selectedFile || !isOnline}
              >
                <Sparkles size={18} color="#ffffff" />
                <Text style={styles.ctaText}>
                  {!isOnline ? 'Offline — Reconnect to Scan' : 'Scan Tasks with AI'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ─── STEP 2: REVIEW DETECTED TASKS ────────────────────────────────────── */}
        {scannedTasks && (
          <View style={styles.reviewContainer}>
            {/* Top Toolbar */}
            <View style={styles.reviewToolbar}>
              <Pressable style={styles.selectAllBtn} onPress={handleToggleSelectAll}>
                {isAllSelected ? (
                  <CheckSquare size={18} color="#6C8EFF" />
                ) : (
                  <Square size={18} color="#64748B" />
                )}
                <Text style={styles.selectAllText}>
                  {isAllSelected ? 'Deselect All' : 'Select All'} ({scannedTasks.length})
                </Text>
              </Pressable>

              <Pressable onPress={() => setScannedTasks(null)}>
                <Text style={styles.reScanText}>Scan Another</Text>
              </Pressable>
            </View>

            {/* List of Tasks */}
            <ScrollView
              style={styles.tasksScrollView}
              contentContainerStyle={styles.tasksScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {scannedTasks.map((task) => {
                const matchedSubject = subjects.find((s) => s.id === task.subjectId);
                const isDropdownOpen = openSubjectDropdownId === task.tempId;

                return (
                  <View
                    key={task.tempId}
                    style={[
                      styles.scannedTaskCard,
                      task.selected && styles.scannedTaskCardSelected,
                    ]}
                  >
                    <View style={styles.scannedTaskRow}>
                      {/* Checkbox */}
                      <Pressable
                        style={styles.taskCheckbox}
                        onPress={() => handleToggleSelectTask(task.tempId)}
                        hitSlop={8}
                      >
                        {task.selected ? (
                          <CheckSquare size={20} color="#6C8EFF" />
                        ) : (
                          <Square size={20} color="#3A4455" />
                        )}
                      </Pressable>

                      {/* Content */}
                      <View style={styles.taskBody}>
                        <TextInput
                          style={styles.taskTitleInput}
                          value={task.title}
                          onChangeText={(text) => handleUpdateTaskTitle(task.tempId, text)}
                          placeholder="Task title"
                          placeholderTextColor="#475569"
                        />

                        {/* Due Date & Subject Row */}
                        <View style={styles.taskMetaRow}>
                          {task.dueDate && (
                            <View style={styles.metaBadge}>
                              <Calendar size={12} color="#94A3B8" />
                              <Text style={styles.metaBadgeText}>
                                {formatDateTimePHT(task.dueDate)}
                              </Text>
                            </View>
                          )}

                          {/* Subject Pill Picker */}
                          <Pressable
                            style={[
                              styles.subjectSelectPill,
                              matchedSubject && {
                                borderColor: matchedSubject.color + '66',
                                backgroundColor: matchedSubject.color + '1A',
                              },
                            ]}
                            onPress={() =>
                              setOpenSubjectDropdownId(isDropdownOpen ? null : task.tempId)
                            }
                          >
                            <BookOpen
                              size={12}
                              color={matchedSubject?.color ?? '#6C8EFF'}
                            />
                            <Text
                              style={[
                                styles.subjectSelectText,
                                matchedSubject?.color ? { color: matchedSubject.color } : null,
                              ]}
                              numberOfLines={1}
                            >
                              {matchedSubject?.name ?? task.subjectName ?? 'Assign Subject'}
                            </Text>
                          </Pressable>
                        </View>

                        {/* Subject Dropdown if Open */}
                        {isDropdownOpen && (
                          <View style={styles.dropdown}>
                            <Pressable
                              style={styles.dropdownItem}
                              onPress={() => handleSelectSubject(task.tempId, null)}
                            >
                              <Text style={styles.dropdownText}>No Subject</Text>
                            </Pressable>
                            {subjects.map((s) => (
                              <Pressable
                                key={s.id}
                                style={styles.dropdownItem}
                                onPress={() => handleSelectSubject(task.tempId, s.id)}
                              >
                                <Text style={styles.dropdownText}>{s.name}</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}

                        {/* Description Preview if present */}
                        {task.description && (
                          <Text style={styles.descText} numberOfLines={2}>
                            {task.description}
                          </Text>
                        )}
                      </View>

                      {/* Delete item */}
                      <Pressable
                        style={styles.trashBtn}
                        onPress={() => handleDeleteTask(task.tempId)}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Import Button */}
            <Pressable
              style={[
                styles.ctaButton,
                (selectedCount === 0 || isImporting) && styles.ctaDisabled,
              ]}
              onPress={handleImport}
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.ctaText}>
                    Import {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#2A3143',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 18,
    lineHeight: 18,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: '#10131C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  disabledCard: {
    opacity: 0.45,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  pickerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,142,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,142,255,0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(108,142,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  fileSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  loadingBox: {
    backgroundColor: '#10131C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  cancelScanBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E2330',
  },
  cancelScanText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 6,
  },
  ctaDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // ── Review Step Styles ──
  reviewContainer: {
    maxHeight: '85%',
  },
  reviewToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
    marginBottom: 12,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  reScanText: {
    fontSize: 13,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  tasksScrollView: {
    maxHeight: 380,
  },
  tasksScrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  scannedTaskCard: {
    backgroundColor: '#10131C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    padding: 12,
  },
  scannedTaskCardSelected: {
    borderColor: 'rgba(108,142,255,0.4)',
    backgroundColor: 'rgba(108,142,255,0.05)',
  },
  scannedTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskCheckbox: {
    marginTop: 3,
  },
  taskBody: {
    flex: 1,
    gap: 8,
  },
  taskTitleInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    padding: 0,
    margin: 0,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2330',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  subjectSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2A3143',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 160,
  },
  subjectSelectText: {
    fontSize: 11,
    color: '#6C8EFF',
    fontWeight: '600',
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdown: {
    backgroundColor: '#1A1F2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3143',
    marginTop: 4,
    padding: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  dropdownText: {
    fontSize: 12,
    color: '#ffffff',
  },
  descText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  trashBtn: {
    padding: 4,
  },
});
