import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Users, CheckCircle2, BookOpen, Layers, UserPlus } from 'lucide-react-native';
import { AdminAnalyticsData } from '@/src/services/admin.api';

interface AdminAnalyticsSectionProps {
  data: AdminAnalyticsData | null;
  isLoading: boolean;
}

export function AdminAnalyticsSection({ data, isLoading }: AdminAnalyticsSectionProps) {
  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C8EFF" />
        <Text style={styles.loadingText}>Fetching system analytics...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Unable to load analytics.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Users Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={18} color="#6C8EFF" />
          <Text style={styles.cardTitle}>User Registrations</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data.users.total}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{data.users.admins}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{data.users.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>
      </View>

      {/* Task Completion Rate Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CheckCircle2 size={18} color="#10B981" />
          <Text style={styles.cardTitle}>Task Manager Activity</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data.tasks.total}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{data.tasks.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#6C8EFF' }]}>{data.tasks.completionRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Content & Schedules Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={18} color="#8B5CF6" />
          <Text style={styles.cardTitle}>System Content</Text>
        </View>
        <View style={styles.grid2x2}>
          <View style={styles.gridBox}>
            <Text style={styles.gridNumber}>{data.content.subjects}</Text>
            <Text style={styles.gridLabel}>Subjects</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridNumber}>{data.content.classSchedules}</Text>
            <Text style={styles.gridLabel}>Class Schedules</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridNumber}>{data.content.calendarEvents}</Text>
            <Text style={styles.gridLabel}>Events</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridNumber}>{data.content.examWeeks}</Text>
            <Text style={styles.gridLabel}>Exam Periods</Text>
          </View>
        </View>
      </View>

      {/* Config Rules Count */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Layers size={18} color="#F59E0B" />
          <Text style={styles.cardTitle}>Global Config Rules</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data.adminConfig.semesterRules}</Text>
            <Text style={styles.statLabel}>Saturday Rules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data.adminConfig.programMappings}</Text>
            <Text style={styles.statLabel}>Program Mappings</Text>
          </View>
        </View>
      </View>

      {/* Recent Registered Users */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <UserPlus size={18} color="#6C8EFF" />
          <Text style={styles.cardTitle}>Recent User Registrations</Text>
        </View>
        {data.recentUsers.length === 0 ? (
          <Text style={styles.emptySub}>No users found.</Text>
        ) : (
          data.recentUsers.map((u) => (
            <View key={u.id} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{(u.name || u.email || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.name || 'Anonymous User'}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
              </View>
              <Text style={[styles.roleTag, u.role === 'ADMIN' && styles.roleAdmin]}>{u.role}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131C',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3143',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A3143',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#10131C',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
  },
  gridNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  gridLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3143',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C8EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleAdmin: {
    color: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
