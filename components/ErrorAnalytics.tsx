// Smart Office Assistant - Error Analytics Component
// Displays error statistics and monitoring data for admin dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorLogger, ErrorSeverity, ErrorCategory, ErrorLogEntry } from '../services/ErrorLoggingService';
import { supabase } from '../supabase';

interface ErrorStatistics {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  recent: ErrorLogEntry[];
}

interface ErrorDashboardData {
  total_errors: number;
  critical_errors: number;
  unresolved_errors: number;
  errors_last_24h: number;
  top_categories: Array<{
    category: string;
    count: number;
    unresolved: number;
  }>;
  recent_critical: Array<{
    id: string;
    timestamp: string;
    category: string;
    message: string;
    resolved: boolean;
  }>;
}

export const ErrorAnalytics: React.FC = () => {
  const [localStats, setLocalStats] = useState<ErrorStatistics | null>(null);
  const [remoteStats, setRemoteStats] = useState<ErrorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'remote'>('local');

  useEffect(() => {
    loadErrorData();
  }, []);

  const loadErrorData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLocalStatistics(),
        loadRemoteStatistics()
      ]);
    } catch (error) {
      console.error('Failed to load error data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStatistics = async () => {
    try {
      const stats = await errorLogger.getErrorStatistics();
      setLocalStats(stats);
    } catch (error) {
      console.error('Failed to load local statistics:', error);
    }
  };

  const loadRemoteStatistics = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_error_dashboard_summary');

      if (error) {
        throw error;
      }

      setRemoteStats(data);
    } catch (error) {
      console.error('Failed to load remote statistics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadErrorData();
    setRefreshing(false);
  };

  const handleSyncLogs = async () => {
    try {
      await errorLogger.syncPendingLogs();
      await loadRemoteStatistics();
    } catch (error) {
      console.error('Failed to sync logs:', error);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#FF4757';
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA726';
      case 'low': return '#66BB6A';
      default: return '#999';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'authentication': return 'lock-closed-outline';
      case 'api': return 'cloud-outline';
      case 'database': return 'server-outline';
      case 'network': return 'wifi-outline';
      case 'ui': return 'phone-portrait-outline';
      case 'navigation': return 'compass-outline';
      case 'notification': return 'notifications-outline';
      case 'storage': return 'folder-outline';
      case 'validation': return 'checkmark-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderStatCard = (title: string, value: number, color: string, icon: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderLocalStats = () => {
    if (!localStats) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Errors', localStats.total, '#4A80F0', 'bug-outline')}
          {renderStatCard('Critical', localStats.bySeverity[ErrorSeverity.CRITICAL] || 0, '#FF4757', 'warning-outline')}
          {renderStatCard('High', localStats.bySeverity[ErrorSeverity.HIGH] || 0, '#FF6B6B', 'alert-circle-outline')}
          {renderStatCard('Medium', localStats.bySeverity[ErrorSeverity.MEDIUM] || 0, '#FFA726', 'information-circle-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Errors by Category</Text>
          {Object.entries(localStats.byCategory).map(([category, count]) => (
            <View key={category} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <Ionicons 
                  name={getCategoryIcon(category) as any} 
                  size={20} 
                  color="#4A80F0" 
                />
                <Text style={styles.categoryName}>{category}</Text>
              </View>
              <Text style={styles.categoryCount}>{count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Errors</Text>
          {localStats.recent.map((error) => (
            <View key={error.id} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(error.severity) }]} />
                <Text style={styles.errorCategory}>{error.category}</Text>
                <Text style={styles.errorTime}>
                  {new Date(error.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.errorMessage} numberOfLines={2}>
                {error.message}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRemoteStats = () => {
    if (!remoteStats) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Errors', remoteStats.total_errors, '#4A80F0', 'cloud-outline')}
          {renderStatCard('Critical', remoteStats.critical_errors, '#FF4757', 'warning-outline')}
          {renderStatCard('Unresolved', remoteStats.unresolved_errors, '#FF6B6B', 'alert-circle-outline')}
          {renderStatCard('Last 24h', remoteStats.errors_last_24h, '#FFA726', 'time-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Error Categories</Text>
          {remoteStats.top_categories?.map((category) => (
            <View key={category.category} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <Ionicons 
                  name={getCategoryIcon(category.category) as any} 
                  size={20} 
                  color="#4A80F0" 
                />
                <Text style={styles.categoryName}>{category.category}</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryCount}>{category.count}</Text>
                {category.unresolved > 0 && (
                  <Text style={styles.unresolvedCount}>({category.unresolved} unresolved)</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Critical Errors</Text>
          {remoteStats.recent_critical?.map((error) => (
            <View key={error.id} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <View style={[styles.severityDot, { backgroundColor: '#FF4757' }]} />
                <Text style={styles.errorCategory}>{error.category}</Text>
                <Text style={styles.errorTime}>
                  {new Date(error.timestamp).toLocaleDateString()}
                </Text>
                {error.resolved && (
                  <Ionicons name="checkmark-circle" size={16} color="#66BB6A" />
                )}
              </View>
              <Text style={styles.errorMessage} numberOfLines={2}>
                {error.message}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading error analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Error Analytics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSyncLogs} style={styles.syncButton}>
            <Ionicons name="sync-outline" size={20} color="#4A80F0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="#4A80F0" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={activeTab === 'local' ? '#4A80F0' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
            Local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'remote' && styles.activeTab]}
          onPress={() => setActiveTab('remote')}
        >
          <Ionicons name="cloud-outline" size={20} color={activeTab === 'remote' ? '#4A80F0' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'remote' && styles.activeTabText]}>
            Remote
          </Text>
        </TouchableOpacity>
      </View>

      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        {activeTab === 'local' ? renderLocalStats() : renderRemoteStats()}
      </RefreshControl>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#4A80F0',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#222B45',
    textTransform: 'capitalize',
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  unresolvedCount: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  errorItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
    textTransform: 'capitalize',
  },
  errorTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ErrorAnalytics;
