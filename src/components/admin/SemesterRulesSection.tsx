import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Plus, Trash2, Calendar, Layers, Pencil, Sparkles } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react';
import { useSemesterRules, SemesterRuleRow } from '@/src/hooks/useSemesterRules';
import { AddSemesterRuleModal } from './AddSemesterRuleModal';
import { AdminAIScannerModal } from './AdminAIScannerModal';
import { AdminApiService } from '@/src/services/admin.api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SemesterRulesSection() {
  const powerSync = usePowerSync();
  const { semesterRules: localRules } = useSemesterRules();
  const [apiRules, setApiRules] = useState<SemesterRuleRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SemesterRuleRow | null>(null);

  const fetchRules = async () => {
    try {
      const res = await AdminApiService.listSemesterRules();
      if (res?.data) {
        setApiRules(
          res.data.map((r: any) => ({
            id: r.id,
            startDate: r.startDate,
            endDate: r.endDate ?? null,
            dayOfWeek: r.dayOfWeek,
            setType: r.setType,
            label: r.label ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch API semester rules', err);
    }
  };

  React.useEffect(() => {
    fetchRules();
  }, []);

  const semesterRules = apiRules.length > 0 ? apiRules : localRules;

  const handleEdit = (rule: SemesterRuleRow) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (rule: SemesterRuleRow) => {
    const dayName = DAY_NAMES[rule.dayOfWeek] || 'Day';
    Alert.alert(
      'Delete Schedule Rule',
      `Are you sure you want to remove the rule for ${dayName} (Set ${rule.setType})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminApiService.deleteSemesterRule(rule.id);
              await powerSync.execute(`DELETE FROM SemesterRule WHERE id = ?`, [rule.id]);
            } catch (err) {
              console.error('Failed to delete rule', err);
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
          <Text style={styles.sectionTitle}>Set A/B Schedule Rules</Text>
          <Text style={styles.sectionSub}>Global rules assigning Set A/B F2F for days of week & date ranges</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button style={styles.scanBtn} onPress={() => setIsScannerOpen(true)}>
            <Sparkles size={14} color="#10B981" />
            <Text style={styles.scanBtnText}>AI Scan</Text>
          </Button>
          <Button style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Button>
        </View>
      </View>

      {/* Rules List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {semesterRules.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={36} color="#2A3143" />
            <Text style={styles.emptyTitle}>No schedule rules defined</Text>
            <Text style={styles.emptySub}>Tap "Add Rule" above to specify Set A or Set B days of week.</Text>
          </View>
        ) : (
          semesterRules.map((rule) => {
            const isSetA = rule.setType === 'A';
            const dayName = DAY_NAMES[rule.dayOfWeek] || 'Unknown';
            const cleanStart = rule.startDate ? rule.startDate.split('T')[0] : '';
            const cleanEnd = rule.endDate ? rule.endDate.split('T')[0] : null;

            return (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.cardLeft}>
                  <View style={styles.titleRow}>
                    <Text style={styles.dayTitle}>{dayName}s</Text>
                    <View style={[styles.typeBadge, isSetA ? styles.badgeSetA : styles.badgeSetB]}>
                      <Layers size={12} color={isSetA ? '#10B981' : '#3B82F6'} />
                      <Text style={[styles.typeBadgeText, isSetA ? styles.textSetA : styles.textSetB]}>
                        Set {rule.setType} F2F
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dateBadge}>
                    <Calendar size={13} color="#94A3B8" />
                    <Text style={styles.dateText}>
                      {cleanEnd ? `${cleanStart} to ${cleanEnd}` : `Starting ${cleanStart}`}
                    </Text>
                  </View>

                  {rule.label ? <Text style={styles.labelSub}>{rule.label}</Text> : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable style={styles.actionBtn} onPress={() => handleEdit(rule)}>
                    <Pencil size={17} color="#6C8EFF" />
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(rule)}>
                    <Trash2 size={17} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddSemesterRuleModal
        visible={isModalOpen}
        initialData={editingRule}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSuccess={() => {
          fetchRules();
        }}
      />

      <AdminAIScannerModal
        visible={isScannerOpen}
        feature="set-ab"
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => fetchRules()}
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
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnText: {
    color: '#10B981',
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
  ruleCard: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSetA: { backgroundColor: 'rgba(16,185,129,0.12)' },
  badgeSetB: { backgroundColor: 'rgba(59,130,246,0.12)' },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  textSetA: { color: '#10B981' },
  textSetB: { color: '#3B82F6' },
  labelSub: {
    fontSize: 12,
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
