import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../ui/text';
import { ShieldAlert, RefreshCw } from 'lucide-react-native';

interface AdminHeaderProps {
  activeTab: 'analytics' | 'semester-rules' | 'program-mappings' | 'exam-weeks' | 'holidays';
  onTabChange: (tab: 'analytics' | 'semester-rules' | 'program-mappings' | 'exam-weeks' | 'holidays') => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminHeader({ activeTab, onTabChange, onRefresh, isRefreshing }: AdminHeaderProps) {

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <ShieldAlert size={18} color="#F59E0B" />
          <Text style={styles.title}>Admin Control Portal</Text>
        </View>
        {onRefresh ? (
          <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} color={isRefreshing ? '#4A5568' : '#6C8EFF'} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
          onPress={() => onTabChange('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
            Analytics
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'semester-rules' && styles.tabActive]}
          onPress={() => onTabChange('semester-rules')}
        >
          <Text style={[styles.tabText, activeTab === 'semester-rules' && styles.tabTextActive]}>
            Set Rules
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'program-mappings' && styles.tabActive]}
          onPress={() => onTabChange('program-mappings')}
        >
          <Text style={[styles.tabText, activeTab === 'program-mappings' && styles.tabTextActive]}>
            Programs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'exam-weeks' && styles.tabActive]}
          onPress={() => onTabChange('exam-weeks')}
        >
          <Text style={[styles.tabText, activeTab === 'exam-weeks' && styles.tabTextActive]}>
            Exams
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'holidays' && styles.tabActive]}
          onPress={() => onTabChange('holidays')}
        >
          <Text style={[styles.tabText, activeTab === 'holidays' && styles.tabTextActive]}>
            Holidays
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161A26',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,142,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#10131C',
  },
  tabActive: {
    backgroundColor: '#6C8EFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});
