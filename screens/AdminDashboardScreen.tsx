import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ErrorAnalytics from '../components/ErrorAnalytics';

// Sample data for charts
const ATTENDANCE_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [
    {
      data: [30, 45, 28, 50, 42],
      color: '#4A80F0',
      label: 'In Office'
    },
    {
      data: [15, 10, 25, 8, 12],
      color: '#34C759',
      label: 'WFH'
    },
    {
      data: [5, 3, 7, 2, 6],
      color: '#FF9500',
      label: 'On Leave'
    }
  ]
};

const PARKING_USAGE = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [
    {
      data: [38, 45, 30, 48, 42],
      color: '#FF9500',
      label: 'Car'
    },
    {
      data: [25, 30, 18, 32, 28],
      color: '#34C759',
      label: 'Bike'
    }
  ]
};

const ROOM_OCCUPANCY = {
  labels: ['Falcon', 'Eagle', 'Hawk', 'Sparrow', 'Condor'],
  datasets: [
    {
      data: [85, 65, 50, 30, 90],
      color: '#4A80F0',
      label: 'Utilization %'
    }
  ]
};

// Helper to create a simple bar chart
const SimpleBarChart = ({ data, height = 200, barWidth = 16, spacing = 30 }) => {
  // Find the max value to scale properly
  const maxValue = Math.max(...data.datasets.reduce((acc, dataset) => {
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
        {data.labels.map((label, labelIndex) => (
          <View key={label} style={styles.barGroup}>
            {data.datasets.map((dataset, datasetIndex) => (
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
const ChartLegend = ({ datasets }) => (
  <View style={styles.legendContainer}>
    {datasets.map((dataset, index) => (
      <View key={index} style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
        <Text style={styles.legendText}>{dataset.label}</Text>
      </View>
    ))}
  </View>
);

// Simple card stats
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Text style={styles.statTitle}>{title}</Text>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const [activeTimeRange, setActiveTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

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
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="analytics-outline"
            size={20}
            color={activeTab === 'overview' ? '#4A80F0' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'errors' && styles.activeTab]}
          onPress={() => setActiveTab('errors')}
        >
          <Ionicons
            name="bug-outline"
            size={20}
            color={activeTab === 'errors' ? '#4A80F0' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'errors' && styles.activeTabText]}>
            Error Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Stats */}
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsRow}>
            <StatCard 
              title="Attendance"
              value="50/60"
              subtitle="83% of employees"
              icon="people"
              color="#4A80F0"
            />
            <StatCard 
              title="Parking"
              value="38/50"
              subtitle="76% occupied"
              icon="car"
              color="#FF9500"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard 
              title="Rooms Booked"
              value="12/15"
              subtitle="80% utilized"
              icon="calendar"
              color="#34C759"
            />
            <StatCard 
              title="WFH"
              value="10"
              subtitle="17% of employees"
              icon="home"
              color="#AF52DE"
            />
          </View>
        </View>
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity 
            style={[
              styles.timeRangeButton,
              activeTimeRange === 'day' && styles.activeTimeRangeButton
            ]}
            onPress={() => setActiveTimeRange('day')}
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
            onPress={() => setActiveTimeRange('week')}
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
            onPress={() => setActiveTimeRange('month')}
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
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Attendance Trends</Text>
          <View style={styles.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SimpleBarChart data={ATTENDANCE_DATA} height={200} />
            </ScrollView>
            <ChartLegend datasets={ATTENDANCE_DATA.datasets} />
          </View>
        </View>
        
        {/* Parking Usage Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Parking Usage</Text>
          <View style={styles.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SimpleBarChart data={PARKING_USAGE} height={200} />
            </ScrollView>
            <ChartLegend datasets={PARKING_USAGE.datasets} />
          </View>
        </View>
        
        {/* Room Occupancy Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Room Occupancy</Text>
          <View style={styles.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SimpleBarChart data={ROOM_OCCUPANCY} height={200} />
            </ScrollView>
            <ChartLegend datasets={ROOM_OCCUPANCY.datasets} />
          </View>
        </View>
        
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
      ) : (
        <ErrorAnalytics />
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
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginVertical: 8,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
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
});