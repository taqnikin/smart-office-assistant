// Smart Office Assistant - AI Insights Component
// Advanced AI-driven analytics and recommendations for admin dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { analyticsAPI } from '../lib/supabase-api';
import { useResponsive, useResponsiveLayout } from '../hooks/useResponsive';

interface AttendancePrediction {
  day: string;
  predictedOfficeAttendance: number;
  predictedWFH: number;
  confidence: number;
}

interface RoomRecommendation {
  id: string;
  name: string;
  capacity: number;
  recommendationScore: number;
  utilizationRate: number;
  userFamiliarity: boolean;
}

interface ConflictDetection {
  conflictId: string;
  room: any;
  date: string;
  conflictingBookings: any[];
  severity: string;
  suggestedResolution: any;
}

interface AIInsightsProps {
  userId?: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ userId }) => {
  const responsive = useResponsive();
  const layout = useResponsiveLayout();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'predictions' | 'recommendations' | 'conflicts' | 'autorelease'>('predictions');
  
  // State for different AI features
  const [attendancePredictions, setAttendancePredictions] = useState<any>(null);
  const [roomRecommendations, setRoomRecommendations] = useState<RoomRecommendation[]>([]);
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictDetection[]>([]);
  const [autoReleaseData, setAutoReleaseData] = useState<any>(null);

  useEffect(() => {
    loadAIInsights();
  }, []);

  const loadAIInsights = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAttendancePredictions(),
        loadConflictDetection(),
        loadAutoReleaseData()
      ]);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendancePredictions = async () => {
    try {
      const predictions = await analyticsAPI.getAttendancePredictions(userId);
      setAttendancePredictions(predictions);
    } catch (error) {
      console.error('Failed to load attendance predictions:', error);
    }
  };

  const loadConflictDetection = async () => {
    try {
      const conflicts = await analyticsAPI.detectBookingConflicts();
      setDetectedConflicts(conflicts);
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
    }
  };

  const loadAutoReleaseData = async () => {
    try {
      const releaseData = await analyticsAPI.detectUnusedBookings();
      setAutoReleaseData(releaseData);
    } catch (error) {
      console.error('Failed to load auto-release data:', error);
    }
  };

  const handleAutoRelease = async () => {
    try {
      Alert.alert(
        'Auto-Release Unused Bookings',
        'This will automatically cancel bookings that are 30+ minutes overdue. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Release',
            style: 'destructive',
            onPress: async () => {
              const result = await analyticsAPI.autoReleaseUnusedBookings();
              toast.success(`Auto-released ${result.autoReleased} unused bookings`);
              await loadAutoReleaseData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to auto-release bookings:', error);
      toast.error('Failed to auto-release bookings');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAIInsights();
    setRefreshing(false);
  };

  const renderPredictionsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Attendance Predictions</Text>
        {attendancePredictions?.weeklyPredictions?.map((prediction: AttendancePrediction) => (
          <View key={prediction.day} style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Text style={styles.dayName}>{prediction.day}</Text>
              <Text style={styles.confidence}>
                {prediction.confidence}% confidence
              </Text>
            </View>
            <View style={styles.predictionBars}>
              <View style={styles.predictionBar}>
                <Text style={styles.barLabel}>Office</Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.barFill, 
                      { width: `${prediction.predictedOfficeAttendance}%`, backgroundColor: '#4A80F0' }
                    ]} 
                  />
                </View>
                <Text style={styles.barValue}>{prediction.predictedOfficeAttendance}%</Text>
              </View>
              <View style={styles.predictionBar}>
                <Text style={styles.barLabel}>WFH</Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.barFill, 
                      { width: `${prediction.predictedWFH}%`, backgroundColor: '#AF52DE' }
                    ]} 
                  />
                </View>
                <Text style={styles.barValue}>{prediction.predictedWFH}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Smart Recommendations</Text>
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Peak Office Days</Text>
          <Text style={styles.recommendationText}>
            {attendancePredictions?.peakOfficeDays?.join(', ') || 'No data available'}
          </Text>
        </View>
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Recommended WFH Days</Text>
          <Text style={styles.recommendationText}>
            {attendancePredictions?.recommendedWFHDays?.join(', ') || 'No data available'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderConflictsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Booking Conflicts</Text>
        {detectedConflicts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.emptyStateText}>No conflicts detected</Text>
          </View>
        ) : (
          detectedConflicts.map((conflict) => (
            <View key={conflict.conflictId} style={styles.conflictCard}>
              <View style={styles.conflictHeader}>
                <Text style={styles.conflictRoom}>{conflict.room.name}</Text>
                <Text style={styles.conflictDate}>{conflict.date}</Text>
              </View>
              <Text style={styles.conflictDescription}>
                {conflict.conflictingBookings.length} overlapping bookings detected
              </Text>
              <View style={styles.conflictActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
                  <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                    Resolve
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderAutoReleaseTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Auto-Release System</Text>
        
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Unused Bookings Detected</Text>
          <Text style={styles.statsValue}>
            {autoReleaseData?.length || 0}
          </Text>
        </View>

        {autoReleaseData?.length > 0 && (
          <TouchableOpacity style={styles.autoReleaseButton} onPress={handleAutoRelease}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.autoReleaseButtonText}>
              Auto-Release Eligible Bookings
            </Text>
          </TouchableOpacity>
        )}

        {autoReleaseData?.map((booking: any) => (
          <View key={booking.id} style={styles.unusedBookingCard}>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingRoom}>{booking.rooms.name}</Text>
              <Text style={styles.bookingTime}>
                {booking.start_time} - {booking.end_time}
              </Text>
            </View>
            <View style={styles.bookingStatus}>
              <Text style={styles.overdueText}>
                {booking.minutesOverdue} min overdue
              </Text>
              {booking.autoReleaseEligible && (
                <View style={styles.eligibleBadge}>
                  <Text style={styles.eligibleText}>Eligible for release</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading AI insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabNavigation, { height: responsive.touchTargetSize(50) }]}
        contentContainerStyle={styles.tabScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'predictions' && styles.activeTab,
            {
              minHeight: responsive.touchTargetSize(),
              paddingHorizontal: responsive.spacing(responsive.isMobile ? 12 : 16),
              minWidth: responsive.isMobile ? 80 : 100,
            }
          ]}
          onPress={() => setActiveTab('predictions')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'predictions' && styles.activeTabText,
            { fontSize: responsive.fontSize(14) }
          ]}>
            {responsive.isMobile ? 'Predict' : 'Predictions'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'conflicts' && styles.activeTab,
            {
              minHeight: responsive.touchTargetSize(),
              paddingHorizontal: responsive.spacing(responsive.isMobile ? 12 : 16),
              minWidth: responsive.isMobile ? 80 : 100,
            }
          ]}
          onPress={() => setActiveTab('conflicts')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'conflicts' && styles.activeTabText,
            { fontSize: responsive.fontSize(14) }
          ]}>
            Conflicts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'autorelease' && styles.activeTab,
            {
              minHeight: responsive.touchTargetSize(),
              paddingHorizontal: responsive.spacing(responsive.isMobile ? 12 : 16),
              minWidth: responsive.isMobile ? 80 : 100,
            }
          ]}
          onPress={() => setActiveTab('autorelease')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'autorelease' && styles.activeTabText,
            { fontSize: responsive.fontSize(14) }
          ]}>
            {responsive.isMobile ? 'Release' : 'Auto-Release'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
        {activeTab === 'autorelease' && renderAutoReleaseTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  tabNavigation: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A80F0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4A80F0',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  confidence: {
    fontSize: 12,
    color: '#666',
  },
  predictionBars: {
    gap: 8,
  },
  predictionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    fontSize: 14,
    color: '#666',
    width: 40,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    color: '#666',
    width: 35,
    textAlign: 'right',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
  },
  conflictCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictRoom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  conflictDate: {
    fontSize: 14,
    color: '#666',
  },
  conflictDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryButton: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  primaryButtonText: {
    color: '#fff',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A80F0',
  },
  autoReleaseButton: {
    backgroundColor: '#FF4757',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  autoReleaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unusedBookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingRoom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: '#666',
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  overdueText: {
    fontSize: 12,
    color: '#FF4757',
    marginBottom: 4,
  },
  eligibleBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eligibleText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default AIInsights;
