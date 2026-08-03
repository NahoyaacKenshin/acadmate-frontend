import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Plus, Trash2, GraduationCap, Calendar, Pencil, Sparkles } from 'lucide-react-native';
import { useExamWeeks, ExamWeekRow } from '@/src/hooks/useExamWeeks';
import { AddExamWeekModal } from '../calendar/AddExamWeekModal';
import { AdminAIScannerModal } from './AdminAIScannerModal';
import { usePowerSync } from '@powersync/react';

export function ExamWeeksSection() {
  const { examWeeks } = useExamWeeks();
  const powerSync = usePowerSync();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExamWeekRow | null>(null);

  const handleEdit = (item: ExamWeekRow) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: ExamWeekRow) => {
    Alert.alert(
      'Delete Period / Holiday',
      `Are you sure you want to remove ${item.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await powerSync.execute('DELETE FROM ExamWeek WHERE id = ?', [item.id]);
            } catch (err) {
              console.error('Failed to delete period', err);
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
          <Text style={styles.sectionTitle}>Exams & Special Periods</Text>
          <Text style={styles.sectionSub}>Global exams, local holidays & class suspensions that pause schedule</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button style={styles.scanBtn} onPress={() => setIsScannerOpen(true)}>
            <Sparkles size={14} color="#F59E0B" />
            <Text style={styles.scanBtnText}>AI Scan</Text>
          </Button>
          <Button style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Button>
        </View>
      </View>

      {/* Exam Weeks List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {examWeeks.length === 0 ? (
          <View style={styles.emptyState}>
            <GraduationCap size={36} color="#2A3143" />
            <Text style={styles.emptyTitle}>No exam or holiday periods scheduled</Text>
            <Text style={styles.emptySub}>Tap "Add Period" to define Exams, School Holidays, or Suspensions.</Text>
          </View>
        ) : (
          examWeeks.map((item) => {
            const startDateClean = item.startDate ? item.startDate.split('T')[0] : '';
            const endDateClean = item.endDate ? item.endDate.split('T')[0] : '';
            return (
              <View key={item.id} style={styles.examCard}>
                <View style={styles.cardLeft}>
                  <View style={styles.examHeader}>
                    <GraduationCap size={16} color="#F59E0B" />
                    <Text style={styles.examTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Calendar size={13} color="#94A3B8" />
                    <Text style={styles.dateRange}>
                      {startDateClean} to {endDateClean}
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

      <AddExamWeekModal
        visible={isModalOpen}
        initialData={editingItem}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
      />

      <AdminAIScannerModal
        visible={isScannerOpen}
        feature="exam-week"
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => {}}
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
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnText: {
    color: '#F59E0B',
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
  examCard: {
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
    flex: 1,
    gap: 6,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateRange: {
    fontSize: 13,
    color: '#94A3B8',
  },
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
