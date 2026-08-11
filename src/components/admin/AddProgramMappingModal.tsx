import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { X, Layers, Plus } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { AdminApiService } from '@/src/services/admin.api';

interface AddProgramMappingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: { id: string; program_name: string; student_set: 'A' | 'B' } | null;
}

export function AddProgramMappingModal({ visible, onClose, onSuccess, initialData }: AddProgramMappingModalProps) {
  const powerSync = usePowerSync();
  const [programName, setProgramName] = useState('');
  const [studentSet, setStudentSet] = useState<'A' | 'B'>('A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialData) {
      setProgramName(initialData.program_name);
      setStudentSet(initialData.student_set);
    } else {
      setProgramName('');
      setStudentSet('A');
    }
  }, [initialData, visible]);

  const handleSubmit = async () => {
    if (!programName.trim()) {
      setError('Please enter a program name (e.g. BSIT)');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const cleanProgramName = programName.trim().toUpperCase();
      const now = new Date().toISOString();

      if (initialData?.id) {
        await AdminApiService.updateProgramMapping(initialData.id, {
          programName: cleanProgramName,
          studentSet,
        });
        await powerSync.execute(
          `UPDATE ProgramMapping SET programName = ?, studentSet = ?, updatedAt = ? WHERE id = ?`,
          [cleanProgramName, studentSet, now, initialData.id]
        );
      } else {
        const res = await AdminApiService.createProgramMapping({
          programName: cleanProgramName,
          studentSet,
        });
        const mapping = res?.data;
        if (mapping?.id) {
          await powerSync.execute(
            `INSERT OR REPLACE INTO ProgramMapping (id, programName, studentSet, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
            [mapping.id, cleanProgramName, studentSet, mapping.createdAt || now, mapping.updatedAt || now]
          );
        }
      }

      setProgramName('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save program mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? 'Edit Program Set Mapping' : 'Add Program Set Mapping'}</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {error && <Text style={styles.errorBanner}>{error}</Text>}

          {/* Program Name Input */}
          <Text style={styles.label}>Degree Program Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. BSIT, BSHM, BEED"
            placeholderTextColor="#94A3B8"
            value={programName}
            onChangeText={setProgramName}
            autoCapitalize="characters"
          />

          {/* Student Set Selector */}
          <Text style={styles.label}>Default Assigned Set</Text>
          <View style={styles.setRow}>
            <Pressable
              style={[styles.setCard, studentSet === 'A' && styles.setCardSelected]}
              onPress={() => setStudentSet('A')}
            >
              <Layers size={18} color={studentSet === 'A' ? '#6C8EFF' : '#94A3B8'} />
              <Text style={[styles.setTitle, studentSet === 'A' && styles.setTitleSelected]}>
                Set A
              </Text>
            </Pressable>

            <Pressable
              style={[styles.setCard, studentSet === 'B' && styles.setCardSelected]}
              onPress={() => setStudentSet('B')}
            >
              <Layers size={18} color={studentSet === 'B' ? '#6C8EFF' : '#94A3B8'} />
              <Text style={[styles.setTitle, studentSet === 'B' && styles.setTitleSelected]}>
                Set B
              </Text>
            </Pressable>
          </View>

          {/* Submit */}
          <Button style={styles.submitBtn} disabled={isSubmitting} onPress={handleSubmit}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnRow}>
                <Plus size={18} color="#ffffff" />
                <Text style={styles.btnText}>Create Program Mapping</Text>
              </View>
            )}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#161A26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    gap: 10,
  },
  setCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#2A3143',
    gap: 8,
  },
  setCardSelected: {
    borderColor: '#6C8EFF',
    backgroundColor: 'rgba(108,142,255,0.1)',
  },
  setTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  setTitleSelected: {
    color: '#6C8EFF',
  },
  submitBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
