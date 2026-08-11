import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Plus, Trash2, GraduationCap, Layers, Pencil, Sparkles } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useProgramMappings, ProgramMappingRow } from '@/src/hooks/useProgramMappings';
import { AddProgramMappingModal } from './AddProgramMappingModal';
import { AdminAIScannerModal } from './AdminAIScannerModal';
import { AdminApiService } from '@/src/services/admin.api';

export function ProgramMappingsSection() {
  const powerSync = usePowerSync();
  const { programMappings: localMappings } = useProgramMappings();
  const [apiMappings, setApiMappings] = useState<ProgramMappingRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ProgramMappingRow | null>(null);

  const fetchMappings = async () => {
    try {
      const res = await AdminApiService.listProgramMappings();
      if (res?.data) {
        setApiMappings(
          res.data.map((m: any) => ({
            id: m.id,
            program_name: m.programName,
            student_set: m.studentSet,
            created_at: m.createdAt,
            updated_at: m.updatedAt,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch API program mappings', err);
    }
  };

  React.useEffect(() => {
    fetchMappings();
  }, []);

  // Combine API and local mappings (favoring API, fallback to local)
  const programMappings = apiMappings.length > 0 ? apiMappings : localMappings;

  const handleEdit = (mapping: ProgramMappingRow) => {
    setEditingMapping(mapping);
    setIsModalOpen(true);
  };

  const handleDelete = (mapping: ProgramMappingRow) => {
    Alert.alert(
      'Delete Program Mapping',
      `Are you sure you want to remove the mapping for ${mapping.program_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminApiService.deleteProgramMapping(mapping.id);
              await powerSync.execute(`DELETE FROM ProgramMapping WHERE id = ?`, [mapping.id]);
            } catch (err) {
              console.error('Failed to delete program mapping', err);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Banner & Add / Scan Buttons */}
      <View style={styles.topRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.sectionTitle}>Program Set Mappings</Text>
          <Text style={styles.sectionSub}>Auto-assign students to Set A or B by degree program</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button style={styles.scanBtn} onPress={() => setIsScannerOpen(true)}>
            <Sparkles size={14} color="#3B82F6" />
            <Text style={styles.scanBtnText}>AI Scan</Text>
          </Button>
          <Button style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Button>
        </View>
      </View>

      {/* Mappings List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {programMappings.length === 0 ? (
          <View style={styles.emptyState}>
            <GraduationCap size={36} color="#2A3143" />
            <Text style={styles.emptyTitle}>No program mappings configured</Text>
            <Text style={styles.emptySub}>Tap "Add Mapping" above to map programs like BSIT to Set A.</Text>
          </View>
        ) : (
          programMappings.map((item) => {
            const isSetA = item.student_set === 'A';
            return (
              <View key={item.id} style={styles.mappingCard}>
                <View style={styles.cardLeft}>
                  <View style={styles.programBadge}>
                    <GraduationCap size={16} color="#6C8EFF" />
                    <Text style={styles.programName}>{item.program_name}</Text>
                  </View>
                  <View style={[styles.setTag, isSetA ? styles.setTagA : styles.setTagB]}>
                    <Layers size={12} color={isSetA ? '#10B981' : '#3B82F6'} />
                    <Text style={[styles.setTagText, isSetA ? styles.setTagTextA : styles.setTagTextB]}>
                      Assigned {item.student_set === 'A' ? 'Set A' : 'Set B'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable style={styles.actionBtn} onPress={() => handleEdit(item)}>
                    <Pencil size={17} color="#6C8EFF" />
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <Trash2 size={17} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddProgramMappingModal
        visible={isModalOpen}
        initialData={editingMapping}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMapping(null);
        }}
        onSuccess={() => {
          fetchMappings();
        }}
      />

      <AdminAIScannerModal
        visible={isScannerOpen}
        feature="program-mapping"
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => fetchMappings()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
    backgroundColor: '#161A26',
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  scanBtn: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#6C8EFF',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161A26',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  programBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  programName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  setTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  setTagA: { backgroundColor: 'rgba(16,185,129,0.12)' },
  setTagB: { backgroundColor: 'rgba(59,130,246,0.12)' },
  setTagText: { fontSize: 12, fontWeight: '700' },
  setTagTextA: { color: '#10B981' },
  setTagTextB: { color: '#3B82F6' },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptySub: {
    fontSize: 13,
    color: '#2A3143',
    textAlign: 'center',
  },
});
