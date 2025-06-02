import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ErrorAnalytics from '../components/ErrorAnalytics';
import UserManagement from '../components/UserManagement';
import AIInsights from '../components/AIInsights';
import { adminAPI, analyticsAPI, User } from '../lib/supabase-api';
import { AuthContext } from '../AuthContext';
import { supabase } from '../supabase';
import { useResponsive, useResponsiveLayout } from '../hooks/useResponsive';

// Types for chart data
interface BarChartDataset {
  data: number[];
  color: string;
  label: string;
}

interface BarChartData {
  labels: string[];
  datasets: BarChartDataset[];
}

interface DashboardStats {
  attendance: {
    total: number;
    office: number;
    wfh: number;
    leave: number;
    totalUsers: number;
  };
  parking: {
    occupied: number;
  };
  rooms: {
    booked: number;
  };
}

// Helper to create a simple bar chart
const SimpleBarChart = ({ data, height = 200, barWidth = 16, spacing = 30 }: { data: BarChartData; height?: number; barWidth?: number; spacing?: number }) => {
  // Find the max value to scale properly
  const maxValue = Math.max(...data.datasets.reduce((acc: number[], dataset: BarChartDataset) => {
    return [...acc, ...dataset.data];
  }, []));
  
  const screenWidth = Dimensions.get('window').width - 32; // Full width minus padding
  const chartWidth = data.labels.length * (data.datasets.length * barWidth + spacing);
  const containerWidth = Math.max(screenWidth, chartWidth);
  
  return (
    <View style={{ height, width: containerWidth }}>
      {/* Y-Axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.axisLabel}>{maxValue}</Text>
        <Text style={styles.axisLabel}>{Math.round(maxValue * 0.75)}</Text>
        <Text style={styles.axisLabel}>{Math.round(maxValue * 0.5)}</Text>
        <Text style={styles.axisLabel}>{Math.round(maxValue * 0.25)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>
      
      {/* Chart grid */}
      <View style={styles.chartGrid}>
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: '25%' }]} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { top: '75%' }]} />
        <View style={[styles.gridLine, { top: '100%' }]} />
      </View>
      
      {/* Bars */}
      <View style={styles.barsContainer}>
        {data.labels.map((label: string, labelIndex: number) => (
          <View key={label} style={styles.barGroup}>
            {data.datasets.map((dataset: BarChartDataset, datasetIndex: number) => (
              <View 
                key={`${label}-${datasetIndex}`}
                style={[
                  styles.bar, 
                  { 
                    height: `${(dataset.data[labelIndex] / maxValue) * 100}%`,
                    backgroundColor: dataset.color,
                    width: barWidth
                  }
                ]}
              />
            ))}
            <Text style={styles.barLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Legend component
const ChartLegend = ({ datasets }: { datasets: BarChartDataset[] }) => (
  <View style={styles.legendContainer}>
    {datasets.map((dataset: BarChartDataset, index: number) => (
      <View key={index} style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
        <Text style={styles.legendText}>{dataset.label}</Text>
      </View>
    ))}
  </View>
);

// Simple card stats
const StatCard = ({ title, value, icon, color, subtitle, responsive }: {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
  responsive?: any;
}) => (
  <View style={[
    styles.statCard,
    responsive && {
      height: responsive.statCardConfig?.cardHeight || 120,
      padding: responsive.spacing ? responsive.spacing(16) : 16,
      borderRadius: responsive.spacing ? responsive.spacing(12) : 12,
    }
  ]}>
    <View style={styles.statHeader}>
      <Text style={[
        styles.statTitle,
        responsive && { fontSize: responsive.textSizes?.subtitle || 14 }
      ]}>{title}</Text>
      <View style={[
        styles.statIconContainer,
        { backgroundColor: color },
        responsive && {
          width: responsive.spacing ? responsive.spacing(32) : 32,
          height: responsive.spacing ? responsive.spacing(32) : 32,
          borderRadius: responsive.spacing ? responsive.spacing(16) : 16,
        }
      ]}>
        <Ionicons
          name={icon}
          size={responsive && responsive.spacing ? responsive.spacing(16) : 20}
          color="white"
        />
      </View>
    </View>
    <Text style={[
      styles.statValue,
      responsive && { fontSize: responsive.textSizes?.title || 22 }
    ]}>{value}</Text>
    {subtitle && (
      <Text style={[
        styles.statSubtitle,
        responsive && { fontSize: responsive.textSizes?.caption || 12 }
      ]}>{subtitle}</Text>
    )}
  </View>
);

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const responsive = useResponsive();
  const layout = useResponsiveLayout();

  // State management
  const [activeTimeRange, setActiveTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'errors' | 'ai' | 'export'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Dashboard data state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [attendanceData, setAttendanceData] = useState<BarChartData | null>(null);
  const [parkingData, setParkingData] = useState<BarChartData | null>(null);
  const [roomData, setRoomData] = useState<BarChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);

      // Fetch today's stats
      const todayStats = await analyticsAPI.getTodayStats();
      setDashboardStats(todayStats);

      // Fetch chart data based on time range
      await fetchChartData(activeTimeRange);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch chart data for specific time range
  const fetchChartData = async (timeRange: 'day' | 'week' | 'month') => {
    try {
      // Fetch attendance stats
      const attendanceStats = await analyticsAPI.getAttendanceStats(timeRange);
      const transformedAttendance = transformAttendanceData(attendanceStats, timeRange);
      setAttendanceData(transformedAttendance);

      // Fetch parking usage
      const parkingStats = await analyticsAPI.getParkingUsage(timeRange);
      const transformedParking = transformParkingData(parkingStats, timeRange);
      setParkingData(transformedParking);

      // Fetch room occupancy
      const roomStats = await analyticsAPI.getRoomOccupancy(timeRange);
      const transformedRooms = transformRoomData(roomStats, timeRange);
      setRoomData(transformedRooms);

    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
  };

  // Transform attendance data for charts
  const transformAttendanceData = (data: any[], timeRange: string): BarChartData => {
    const labels = getTimeLabels(timeRange);
    const officeData: number[] = [];
    const wfhData: number[] = [];
    const leaveData: number[] = [];

    labels.forEach(label => {
      const dayData = data.filter(record => {
        const recordDate = new Date(record.attendance_date);
        return matchesTimeLabel(recordDate, label, timeRange);
      });

      officeData.push(dayData.filter(r => r.status === 'office').length);
      wfhData.push(dayData.filter(r => r.status === 'wfh').length);
      leaveData.push(dayData.filter(r => r.status === 'leave').length);
    });

    return {
      labels,
      datasets: [
        { data: officeData, color: '#4A80F0', label: 'In Office' },
        { data: wfhData, color: '#34C759', label: 'WFH' },
        { data: leaveData, color: '#FF9500', label: 'On Leave' }
      ]
    };
  };

  // Transform parking data for charts
  const transformParkingData = (data: any[], timeRange: string): BarChartData => {
    const labels = getTimeLabels(timeRange);
    const carData: number[] = [];
    const bikeData: number[] = [];

    labels.forEach(label => {
      const dayData = data.filter(record => {
        const recordDate = new Date(record.reservation_date);
        return matchesTimeLabel(recordDate, label, timeRange);
      });

      carData.push(dayData.filter(r => r.parking_spots?.spot_type === 'car').length);
      bikeData.push(dayData.filter(r => r.parking_spots?.spot_type === 'bike').length);
    });

    return {
      labels,
      datasets: [
        { data: carData, color: '#FF9500', label: 'Car' },
        { data: bikeData, color: '#34C759', label: 'Bike' }
      ]
    };
  };

  // Transform room data for charts
  const transformRoomData = (data: any[], timeRange: string): BarChartData => {
    const roomCounts: { [key: string]: number } = {};

    data.forEach(record => {
      const roomName = record.rooms?.name;
      if (roomName) {
        roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
      }
    });

    const labels = Object.keys(roomCounts);
    const values = Object.values(roomCounts);

    return {
      labels,
      datasets: [
        { data: values, color: '#4A80F0', label: 'Bookings' }
      ]
    };
  };

  // Get time labels based on range
  const getTimeLabels = (timeRange: string): string[] => {
    switch (timeRange) {
      case 'day':
        return ['6AM', '9AM', '12PM', '3PM', '6PM'];
      case 'week':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      case 'month':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      default:
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }
  };

  // Check if date matches time label
  const matchesTimeLabel = (date: Date, label: string, timeRange: string): boolean => {
    switch (timeRange) {
      case 'day':
        const hour = date.getHours();
        switch (label) {
          case '6AM': return hour >= 6 && hour < 9;
          case '9AM': return hour >= 9 && hour < 12;
          case '12PM': return hour >= 12 && hour < 15;
          case '3PM': return hour >= 15 && hour < 18;
          case '6PM': return hour >= 18;
          default: return false;
        }
      case 'week':
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[date.getDay()] === label;
      case 'month':
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        return label === `Week ${weekOfMonth}`;
      default:
        return false;
    }
  };

  // Refresh dashboard data
  const refreshDashboardData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Handle time range change
  const handleTimeRangeChange = async (newRange: 'day' | 'week' | 'month') => {
    setActiveTimeRange(newRange);
    await fetchChartData(newRange);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await adminAPI.softDeleteUser(id);
    setUsers((users: User[]) => users.filter((u: User) => u.id !== id));
  };

  // Data export functionality
  const exportData = async (dataType: string, format: 'csv' | 'json') => {
    try {
      toast.info(`Preparing ${dataType} export...`);

      let data: any[] = [];
      let filename = '';

      // Fetch real data from database
      data = await analyticsAPI.exportData(dataType as any, activeTimeRange);
      filename = `${dataType}_export_${new Date().toISOString().split('T')[0]}`;

      // Transform data for export
      switch (dataType) {
        case 'attendance':
          data = data.map(record => ({
            date: record.attendance_date,
            employee_name: record.users?.employee_details?.full_name || 'Unknown',
            employee_id: record.users?.employee_details?.employee_id || 'Unknown',
            status: record.status,
            check_in: record.check_in_time || '',
            check_out: record.check_out_time || '',
            transport_mode: record.transport_mode || ''
          }));
          break;

        case 'bookings':
          data = data.map(record => ({
            date: record.booking_date,
            room_name: record.rooms?.name || 'Unknown',
            employee_name: record.users?.employee_details?.full_name || 'Unknown',
            employee_id: record.users?.employee_details?.employee_id || 'Unknown',
            start_time: record.start_time,
            end_time: record.end_time,
            purpose: record.purpose || '',
            status: record.status
          }));
          break;

        case 'parking':
          data = data.map(record => ({
            date: record.reservation_date,
            spot_number: record.parking_spots?.spot_number || 'Unknown',
            spot_type: record.parking_spots?.spot_type || 'Unknown',
            employee_name: record.users?.employee_details?.full_name || 'Unknown',
            employee_id: record.users?.employee_details?.employee_id || 'Unknown',
            start_time: record.start_time || '',
            end_time: record.end_time || '',
            status: record.status
          }));
          break;

        case 'users':
          data = data.map(record => ({
            email: record.email,
            full_name: record.employee_details?.full_name || 'Unknown',
            employee_id: record.employee_details?.employee_id || 'Unknown',
            work_mode: record.employee_details?.work_mode || 'Unknown',
            date_of_joining: record.employee_details?.date_of_joining || '',
            role: record.role,
            is_active: record.is_active,
            created_at: record.created_at
          }));
          break;

        default:
          throw new Error('Invalid data type');
      }

      let fileContent = '';
      let fileExtension = '';

      if (format === 'csv') {
        // Convert to CSV
        if (data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => Object.values(row).join(',')).join('\n');
          fileContent = `${headers}\n${rows}`;
        }
        fileExtension = 'csv';
      } else {
        // Convert to JSON
        fileContent = JSON.stringify(data, null, 2);
        fileExtension = 'json';
      }

      // Save file
      const fileUri = `${FileSystem.documentDirectory}${filename}.${fileExtension}`;
      await FileSystem.writeAsStringAsync(fileUri, fileContent);

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'csv' ? 'text/csv' : 'application/json',
          dialogTitle: `Export ${dataType} data`
        });
        toast.success(`${dataType} data exported successfully!`);
      } else {
        toast.success(`${dataType} data saved to: ${fileUri}`);
      }

    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${dataType} data`);
    }
  };

  // Initial data fetch and real-time subscription
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();

      // Set up real-time subscription for dashboard updates
      const subscription = supabase
        .channel('dashboard_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_records' },
          () => fetchDashboardData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'parking_reservations' },
          () => fetchDashboardData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'room_bookings' },
          () => fetchDashboardData()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222B45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={{ width: 40 }} /> {/* Empty view for alignment */}
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabContainer, { height: responsive.touchTargetSize(responsive.tabConfig?.tabHeight || 44) }]}
        contentContainerStyle={styles.tabScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'overview' && styles.activeTab,
            { minHeight: responsive.touchTargetSize(), paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16) }
          ]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="analytics-outline"
            size={responsive.tabConfig?.iconSize || 20}
            color={activeTab === 'overview' ? '#4A80F0' : '#999'}
          />
          {responsive.tabConfig?.showLabels && (
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && styles.activeTab,
            { minHeight: responsive.touchTargetSize(), paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16) }
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people-outline"
            size={responsive.tabConfig?.iconSize || 20}
            color={activeTab === 'users' ? '#4A80F0' : '#999'}
          />
          {responsive.tabConfig?.showLabels && (
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Users
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'errors' && styles.activeTab,
            { minHeight: responsive.touchTargetSize(), paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16) }
          ]}
          onPress={() => setActiveTab('errors')}
        >
          <Ionicons
            name="bug-outline"
            size={responsive.tabConfig?.iconSize || 20}
            color={activeTab === 'errors' ? '#4A80F0' : '#999'}
          />
          {responsive.tabConfig?.showLabels && (
            <Text style={[styles.tabText, activeTab === 'errors' && styles.activeTabText]}>
              {responsive.isMobile ? 'Errors' : 'Error Logs'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'ai' && styles.activeTab,
            { minHeight: responsive.touchTargetSize(), paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16) }
          ]}
          onPress={() => setActiveTab('ai')}
        >
          <Ionicons
            name="bulb-outline"
            size={responsive.tabConfig?.iconSize || 20}
            color={activeTab === 'ai' ? '#4A80F0' : '#999'}
          />
          {responsive.tabConfig?.showLabels && (
            <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
              {responsive.isMobile ? 'AI' : 'AI Insights'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'export' && styles.activeTab,
            { minHeight: responsive.touchTargetSize(), paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16) }
          ]}
          onPress={() => setActiveTab('export')}
        >
          <Ionicons
            name="download-outline"
            size={responsive.tabConfig?.iconSize || 20}
            color={activeTab === 'export' ? '#4A80F0' : '#999'}
          />
          {responsive.tabConfig?.showLabels && (
            <Text style={[styles.tabText, activeTab === 'export' && styles.activeTabText]}>
              Export
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshDashboardData}
              colors={['#4A80F0']}
              tintColor="#4A80F0"
            />
          }
        >
          {/* Quick Stats */}
          <View style={[styles.section, { paddingHorizontal: responsive.containerPadding || 16 }]}>
            <Text style={[styles.sectionTitle, { fontSize: responsive.textSizes?.title || 18 }]}>Today's Overview</Text>
            <View style={[
              styles.statsContainer,
              {
                flexDirection: responsive.statCardConfig?.cardsPerRow === 1 ? 'column' : 'row',
                flexWrap: 'wrap',
                marginHorizontal: -(responsive.statCardConfig?.spacing || 16) / 2,
              }
            ]}>
              <View style={[
                styles.statCardWrapper,
                {
                  width: responsive.statCardConfig?.cardsPerRow === 1 ? '100%' : `${100 / (responsive.statCardConfig?.cardsPerRow || 2)}%`,
                  paddingHorizontal: (responsive.statCardConfig?.spacing || 16) / 2,
                  marginBottom: responsive.statCardConfig?.spacing || 16,
                }
              ]}>
                <StatCard
                  title="Attendance"
                  value={dashboardStats ? `${dashboardStats.attendance.total}/${dashboardStats.attendance.totalUsers}` : "0/0"}
                  subtitle={dashboardStats ? `${Math.round((dashboardStats.attendance.total / dashboardStats.attendance.totalUsers) * 100)}% of employees` : "0% of employees"}
                  icon="people"
                  color="#4A80F0"
                  responsive={responsive}
                />
              </View>
              <View style={[
                styles.statCardWrapper,
                {
                  width: responsive.statCardConfig?.cardsPerRow === 1 ? '100%' : `${100 / (responsive.statCardConfig?.cardsPerRow || 2)}%`,
                  paddingHorizontal: (responsive.statCardConfig?.spacing || 16) / 2,
                  marginBottom: responsive.statCardConfig?.spacing || 16,
                }
              ]}>
                <StatCard
                  title="Parking"
                  value={dashboardStats ? `${dashboardStats.parking.occupied}/50` : "0/50"}
                  subtitle={dashboardStats ? `${Math.round((dashboardStats.parking.occupied / 50) * 100)}% occupied` : "0% occupied"}
                  icon="car"
                  color="#FF9500"
                  responsive={responsive}
                />
              </View>
              <View style={[
                styles.statCardWrapper,
                {
                  width: responsive.statCardConfig?.cardsPerRow === 1 ? '100%' : `${100 / (responsive.statCardConfig?.cardsPerRow || 2)}%`,
                  paddingHorizontal: (responsive.statCardConfig?.spacing || 16) / 2,
                  marginBottom: responsive.statCardConfig?.spacing || 16,
                }
              ]}>
                <StatCard
                  title="Rooms Booked"
                  value={dashboardStats ? `${dashboardStats.rooms.booked}/15` : "0/15"}
                  subtitle={dashboardStats ? `${Math.round((dashboardStats.rooms.booked / 15) * 100)}% utilized` : "0% utilized"}
                  icon="calendar"
                  color="#34C759"
                  responsive={responsive}
                />
              </View>
              <View style={[
                styles.statCardWrapper,
                {
                  width: responsive.statCardConfig?.cardsPerRow === 1 ? '100%' : `${100 / (responsive.statCardConfig?.cardsPerRow || 2)}%`,
                  paddingHorizontal: (responsive.statCardConfig?.spacing || 16) / 2,
                  marginBottom: responsive.statCardConfig?.spacing || 16,
                }
              ]}>
                <StatCard
                  title="WFH"
                  value={dashboardStats ? `${dashboardStats.attendance.wfh}` : "0"}
                  subtitle={dashboardStats ? `${Math.round((dashboardStats.attendance.wfh / dashboardStats.attendance.totalUsers) * 100)}% of employees` : "0% of employees"}
                  icon="home"
                  color="#AF52DE"
                  responsive={responsive}
                />
              </View>
            </View>
          </View>
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              activeTimeRange === 'day' && styles.activeTimeRangeButton
            ]}
            onPress={() => handleTimeRangeChange('day')}
          >
            <Text style={[
              styles.timeRangeText,
              activeTimeRange === 'day' && styles.activeTimeRangeText
            ]}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              activeTimeRange === 'week' && styles.activeTimeRangeButton
            ]}
            onPress={() => handleTimeRangeChange('week')}
          >
            <Text style={[
              styles.timeRangeText,
              activeTimeRange === 'week' && styles.activeTimeRangeText
            ]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              activeTimeRange === 'month' && styles.activeTimeRangeButton
            ]}
            onPress={() => handleTimeRangeChange('month')}
          >
            <Text style={[
              styles.timeRangeText,
              activeTimeRange === 'month' && styles.activeTimeRangeText
            ]}>
              Month
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Attendance Chart */}
        {attendanceData && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Attendance Trends</Text>
            <View style={styles.chartCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SimpleBarChart data={attendanceData} height={200} />
              </ScrollView>
              <ChartLegend datasets={attendanceData.datasets} />
            </View>
          </View>
        )}

        {/* Parking Usage Chart */}
        {parkingData && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Parking Usage</Text>
            <View style={styles.chartCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SimpleBarChart data={parkingData} height={200} />
              </ScrollView>
              <ChartLegend datasets={parkingData.datasets} />
            </View>
          </View>
        )}

        {/* Room Occupancy Chart */}
        {roomData && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Room Occupancy</Text>
            <View style={styles.chartCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SimpleBarChart data={roomData} height={200} />
              </ScrollView>
              <ChartLegend datasets={roomData.datasets} />
            </View>
          </View>
        )}
        
        {/* Key Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          
          <View style={styles.insightCard}>
            <View style={styles.insightIconContainer}>
              <Ionicons name="analytics" size={24} color="#4A80F0" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Peak Office Day</Text>
              <Text style={styles.insightValue}>Tuesday</Text>
              <Text style={styles.insightDescription}>
                Tuesdays have the highest office attendance with 45 employees on average.
              </Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <View style={styles.insightIconContainer}>
              <Ionicons name="car" size={24} color="#FF9500" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Parking Availability</Text>
              <Text style={styles.insightValue}>Most Critical on Thursdays</Text>
              <Text style={styles.insightDescription}>
                Consider implementing reserve-ahead parking on Thursdays to avoid shortages.
              </Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <View style={styles.insightIconContainer}>
              <Ionicons name="business" size={24} color="#34C759" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Room Utilization</Text>
              <Text style={styles.insightValue}>Falcon & Condor at 85%+</Text>
              <Text style={styles.insightDescription}>
                These rooms are almost at capacity. Consider expanding similar facilities.
              </Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <View style={styles.insightIconContainer}>
              <Ionicons name="time" size={24} color="#AF52DE" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Meeting No-Shows</Text>
              <Text style={styles.insightValue}>12% of bookings</Text>
              <Text style={styles.insightDescription}>
                Implementing 10-min auto-release could increase room availability by 15%.
              </Text>
            </View>
          </View>
        </View>
        </ScrollView>
      ) : activeTab === 'users' ? (
        <UserManagement />
      ) : activeTab === 'errors' ? (
        <ErrorAnalytics />
      ) : activeTab === 'ai' ? (
        <AIInsights userId={user?.id} />
      ) : (
        // Export Tab Content
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Export</Text>
            <Text style={styles.exportDescription}>
              Export your office data in CSV or JSON format for analysis and reporting.
            </Text>
          </View>

          {/* Export Cards */}
          <View style={styles.section}>
            <View style={styles.exportCard}>
              <View style={styles.exportCardHeader}>
                <View style={styles.exportIconContainer}>
                  <Ionicons name="people" size={24} color="#4A80F0" />
                </View>
                <View style={styles.exportCardContent}>
                  <Text style={styles.exportCardTitle}>Attendance Data</Text>
                  <Text style={styles.exportCardDescription}>
                    Export daily attendance records, check-in/out times, and work modes
                  </Text>
                </View>
              </View>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={[styles.exportButton, styles.csvButton]}
                  onPress={() => exportData('attendance', 'csv')}
                >
                  <Ionicons name="document-text" size={16} color="#34C759" />
                  <Text style={[styles.exportButtonText, { color: '#34C759' }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportButton, styles.jsonButton]}
                  onPress={() => exportData('attendance', 'json')}
                >
                  <Ionicons name="code" size={16} color="#FF9500" />
                  <Text style={[styles.exportButtonText, { color: '#FF9500' }]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.exportCard}>
              <View style={styles.exportCardHeader}>
                <View style={styles.exportIconContainer}>
                  <Ionicons name="calendar" size={24} color="#34C759" />
                </View>
                <View style={styles.exportCardContent}>
                  <Text style={styles.exportCardTitle}>Room Bookings</Text>
                  <Text style={styles.exportCardDescription}>
                    Export meeting room reservations, schedules, and utilization data
                  </Text>
                </View>
              </View>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={[styles.exportButton, styles.csvButton]}
                  onPress={() => exportData('bookings', 'csv')}
                >
                  <Ionicons name="document-text" size={16} color="#34C759" />
                  <Text style={[styles.exportButtonText, { color: '#34C759' }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportButton, styles.jsonButton]}
                  onPress={() => exportData('bookings', 'json')}
                >
                  <Ionicons name="code" size={16} color="#FF9500" />
                  <Text style={[styles.exportButtonText, { color: '#FF9500' }]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.exportCard}>
              <View style={styles.exportCardHeader}>
                <View style={styles.exportIconContainer}>
                  <Ionicons name="car" size={24} color="#FF9500" />
                </View>
                <View style={styles.exportCardContent}>
                  <Text style={styles.exportCardTitle}>Parking Reservations</Text>
                  <Text style={styles.exportCardDescription}>
                    Export parking spot reservations and vehicle information
                  </Text>
                </View>
              </View>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={[styles.exportButton, styles.csvButton]}
                  onPress={() => exportData('parking', 'csv')}
                >
                  <Ionicons name="document-text" size={16} color="#34C759" />
                  <Text style={[styles.exportButtonText, { color: '#34C759' }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportButton, styles.jsonButton]}
                  onPress={() => exportData('parking', 'json')}
                >
                  <Ionicons name="code" size={16} color="#FF9500" />
                  <Text style={[styles.exportButtonText, { color: '#FF9500' }]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.exportCard}>
              <View style={styles.exportCardHeader}>
                <View style={styles.exportIconContainer}>
                  <Ionicons name="person" size={24} color="#AF52DE" />
                </View>
                <View style={styles.exportCardContent}>
                  <Text style={styles.exportCardTitle}>User Data</Text>
                  <Text style={styles.exportCardDescription}>
                    Export employee information, preferences, and profile data
                  </Text>
                </View>
              </View>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={[styles.exportButton, styles.csvButton]}
                  onPress={() => exportData('users', 'csv')}
                >
                  <Ionicons name="document-text" size={16} color="#34C759" />
                  <Text style={[styles.exportButtonText, { color: '#34C759' }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportButton, styles.jsonButton]}
                  onPress={() => exportData('users', 'json')}
                >
                  <Ionicons name="code" size={16} color="#FF9500" />
                  <Text style={[styles.exportButtonText, { color: '#FF9500' }]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Export Info */}
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#4A80F0" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Export Information</Text>
                <Text style={styles.infoText}>
                  • CSV files can be opened in Excel or Google Sheets{'\n'}
                  • JSON files are suitable for technical analysis{'\n'}
                  • Data includes records from the last 30 days{'\n'}
                  • Files are automatically shared via your device's sharing options
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
    marginRight: 8,
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCardWrapper: {
    // Dynamic width set via responsive props
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#8F9BB3',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  activeTimeRangeButton: {
    backgroundColor: '#4A80F0',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#8F9BB3',
    fontWeight: '500',
  },
  activeTimeRangeText: {
    color: 'white',
    fontWeight: '600',
  },
  chartSection: {
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 30, // Space for x-axis labels
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    width: 35,
  },
  axisLabel: {
    fontSize: 10,
    color: '#8F9BB3',
  },
  chartGrid: {
    position: 'absolute',
    left: 40, // Space for y-axis labels
    right: 0,
    top: 0,
    bottom: 30, // Space for x-axis labels
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EDF1F7',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'absolute',
    left: 40, // Space for y-axis labels
    right: 0,
    bottom: 30, // Space for x-axis labels
    top: 0,
    justifyContent: 'space-around',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    marginHorizontal: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    position: 'absolute',
    bottom: -25, // Below the bars
    textAlign: 'center',
    fontSize: 12,
    color: '#8F9BB3',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    paddingLeft: 40, // Align with chart
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8F9BB3',
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#8F9BB3',
    lineHeight: 20,
  },
  exportDescription: {
    fontSize: 16,
    color: '#8F9BB3',
    lineHeight: 22,
    marginBottom: 8,
  },
  exportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportCardContent: {
    flex: 1,
  },
  exportCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 4,
  },
  exportCardDescription: {
    fontSize: 14,
    color: '#8F9BB3',
    lineHeight: 20,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    flex: 0.45,
  },
  csvButton: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  jsonButton: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8F0',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8F9BB3',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8F9BB3',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});