import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { AdminHeader } from '@/src/components/admin/AdminHeader';
import { AdminAnalyticsSection } from '@/src/components/admin/AdminAnalyticsSection';
import { SemesterRulesSection } from '@/src/components/admin/SemesterRulesSection';
import { ProgramMappingsSection } from '@/src/components/admin/ProgramMappingsSection';
import { ExamWeeksSection } from '@/src/components/admin/ExamWeeksSection';
import { HolidaysSection } from '@/src/components/admin/HolidaysSection';
import { AdminApiService, AdminAnalyticsData } from '@/src/services/admin.api';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'semester-rules' | 'program-mappings' | 'exam-weeks' | 'holidays'
  >('analytics');

  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await AdminApiService.getAnalytics();
      if (res?.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAnalytics();
    }
  }, [user]);

  // Access Guard: Non-admin check
  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.deniedContainer}>
        <View style={styles.deniedCard}>
          <ShieldAlert size={48} color="#EF4444" />
          <Text style={styles.deniedTitle}>Access Restricted</Text>
          <Text style={styles.deniedSub}>
            The Admin Portal is restricted to authorized system administrators only.
          </Text>
          <Button style={styles.deniedBtn} onPress={() => router.replace('/' as any)}>
            <ArrowLeft size={16} color="#ffffff" />
            <Text style={styles.deniedBtnText}>Return to App</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AdminHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={fetchAnalytics}
          isRefreshing={isLoadingAnalytics}
        />

        <View style={styles.body}>
          {activeTab === 'analytics' && (
            <AdminAnalyticsSection data={analyticsData} isLoading={isLoadingAnalytics} />
          )}
          {activeTab === 'semester-rules' && <SemesterRulesSection />}
          {activeTab === 'program-mappings' && <ProgramMappingsSection />}
          {activeTab === 'exam-weeks' && <ExamWeeksSection />}
          {activeTab === 'holidays' && <HolidaysSection />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#161A26',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  body: {
    flex: 1,
  },
  deniedContainer: {
    flex: 1,
    backgroundColor: '#10131C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedCard: {
    backgroundColor: '#161A26',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    gap: 12,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  deniedSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  deniedBtn: {
    backgroundColor: '#6C8EFF',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deniedBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
