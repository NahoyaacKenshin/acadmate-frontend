import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { CalendarDays, Flag, Sparkles } from 'lucide-react-native';
import { useHolidays, HolidayRow } from '@/src/hooks/useHolidays';
import { AdminAIScannerModal, AdminFeatureType } from './AdminAIScannerModal';
import { ApiService } from '@/src/services/api';

export function HolidaysSection() {
  const { holidays: dbHolidays } = useHolidays();
  const [apiHolidays, setApiHolidays] = useState<HolidayRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeScanner, setActiveScanner] = useState<AdminFeatureType | null>(null);

  useEffect(() => {
    async function fetchHolidays() {
      setIsLoading(true);
      try {
        const res = await ApiService.holidays.get(2026);
        if (res?.data && Array.isArray(res.data)) {
          setApiHolidays(
            res.data.map((h: any) => ({
              id: h.id || h.name,
              date: h.date,
              name: h.name,
              type: h.type as 'REGULAR' | 'SPECIAL',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch holidays via API', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHolidays();
  }, []);

  const allHolidays = dbHolidays.length > 0 ? dbHolidays : apiHolidays;

  return (
    <View style={styles.container}>
      {/* Top Banner & Scan Buttons */}
      <View style={styles.topRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.sectionTitle}>Philippine Holidays & Suspensions (2026)</Text>
          <Text style={styles.sectionSub}>Regular, Special Non-Working Holidays, and Class Suspensions</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button style={styles.scanBtnHoliday} onPress={() => setActiveScanner('special-holidays')}>
            <Sparkles size={13} color="#EF4444" />
            <Text style={styles.scanBtnTextHoliday}>Scan Holidays</Text>
          </Button>
          <Button style={styles.scanBtnSuspension} onPress={() => setActiveScanner('suspension')}>
            <Sparkles size={13} color="#EC4899" />
            <Text style={styles.scanBtnTextSuspension}>Scan Suspensions</Text>
          </Button>
        </View>
      </View>

      {/* Holidays List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {isLoading && allHolidays.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6C8EFF" />
            <Text style={styles.loadingText}>Loading 2026 official holidays...</Text>
          </View>
        ) : allHolidays.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={36} color="#2A3143" />
            <Text style={styles.emptyTitle}>No holidays loaded</Text>
          </View>
        ) : (
          allHolidays.map((h) => {
            const isRegular = h.type === 'REGULAR';
            const dateClean = h.date ? h.date.split('T')[0] : '';
            return (
              <View key={h.id || `${h.date}-${h.name}`} style={styles.holidayCard}>
                <View style={styles.cardLeft}>
                  <View style={styles.holidayHeader}>
                    <Flag size={16} color={isRegular ? '#EF4444' : '#F59E0B'} />
                    <Text style={styles.holidayName}>{h.name}</Text>
                  </View>
                  <Text style={styles.holidayDate}>{dateClean}</Text>
                </View>
                <View style={[styles.typeBadge, isRegular ? styles.badgeRegular : styles.badgeSpecial]}>
                  <Text style={[styles.typeText, isRegular ? styles.textRegular : styles.textSpecial]}>
                    {isRegular ? 'REGULAR' : 'SPECIAL'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {activeScanner ? (
        <AdminAIScannerModal
          visible={activeScanner !== null}
          feature={activeScanner}
          onClose={() => setActiveScanner(null)}
          onSuccess={() => {}}
        />
      ) : null}
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
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scanBtnHoliday: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 8,
    height: 34,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnTextHoliday: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  scanBtnSuspension: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    paddingHorizontal: 8,
    height: 34,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnTextSuspension: {
    color: '#EC4899',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  holidayCard: {
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
    gap: 4,
  },
  holidayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  holidayDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 24,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeRegular: { backgroundColor: 'rgba(239,68,68,0.12)' },
  badgeSpecial: { backgroundColor: 'rgba(245,158,11,0.12)' },
  typeText: { fontSize: 11, fontWeight: '700' },
  textRegular: { color: '#EF4444' },
  textSpecial: { color: '#F59E0B' },
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
});
