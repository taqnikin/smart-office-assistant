import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { user, signOut } = useContext(AuthContext);
  
  // Extract data from the current user email
  const userDetails = useMemo(() => {
    // Default details
    const details = {
      fullName: 'Guest User',
      companyId: 'N/A',
      department: 'Not specified',
      position: 'Not specified',
      phoneNumber: 'Not provided',
      location: 'Not specified',
      joinDate: 'Not available',
    };
    
    // If we have a user email, determine the user details
    if (user?.email) {
      if (user.email.includes('admin')) {
        return {
          fullName: 'Admin User',
          companyId: 'ADMIN001',
          department: 'IT Operations',
          position: 'System Administrator',
          phoneNumber: '+1 (555) 123-4567',
          location: 'Headquarters',
          joinDate: 'January 1, 2020',
        };
      } else {
        // Regular user
        return {
          fullName: 'Alex Johnson',
          companyId: 'EMP12345',
          department: 'Engineering',
          position: 'Senior Software Developer',
          phoneNumber: '+1 (555) 987-6543',
          location: 'San Francisco Office',
          joinDate: 'January 15, 2022',
        };
      }
    }
    
    return details;
  }, [user?.email]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Profile image and basic info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: `https://api.a0.dev/assets/image?text=${encodeURIComponent(userDetails.fullName)}&aspect=1:1` }}
            style={styles.profileImage}
          />
          <Text style={styles.nameText}>{userDetails.fullName}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, user?.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
              <Text style={styles.badgeText}>{user?.role === 'admin' ? 'Admin' : 'User'}</Text>
            </View>
          </View>
          <Text style={styles.emailText}>{user?.email || 'No email available'}</Text>
        </View>
        
        {/* Information section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.infoCard}>
            <InfoItem 
              iconName="business" 
              label="Company ID"
              value={userDetails.companyId}
            />
            
            <View style={styles.divider} />
            
            <InfoItem 
              iconName="briefcase" 
              label="Department"
              value={userDetails.department}
            />
            
            <View style={styles.divider} />
            
            <InfoItem 
              iconName="person" 
              label="Position"
              value={userDetails.position}
            />
          </View>
        </View>
        
        {/* Contact Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoCard}>
            <InfoItem 
              iconName="mail" 
              label="Email"
              value={user?.email || 'No email available'}
            />
            
            <View style={styles.divider} />
            
            <InfoItem 
              iconName="call" 
              label="Phone Number"
              value={userDetails.phoneNumber}
            />
            
            <View style={styles.divider} />
            
            <InfoItem 
              iconName="location" 
              label="Location"
              value={userDetails.location}
            />
            
            <View style={styles.divider} />
            
            <InfoItem 
              iconName="calendar" 
              label="Join Date"
              value={userDetails.joinDate}
            />
          </View>
        </View>
        
        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('NotificationSettings' as never)}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="notifications-outline" size={22} color="#4A80F0" />
            </View>
            <Text style={styles.actionText}>Notification Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="settings-outline" size={22} color="#4A80F0" />
            </View>
            <Text style={styles.actionText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#4A80F0" />
            </View>
            <Text style={styles.actionText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="help-circle-outline" size={22} color="#4A80F0" />
            </View>
            <Text style={styles.actionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
          </TouchableOpacity>
        </View>
        
        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityLabel="Sign out button"
          testID="sign-out-button"
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for info items
const InfoItem = ({ iconName, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.iconContainer}>
      <Ionicons name={iconName} size={18} color="#4A80F0" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#E6EFFE',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#8F9BB3',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  adminBadge: {
    backgroundColor: '#FF9500',
  },
  userBadge: {
    backgroundColor: '#4A80F0',
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6EFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#222B45',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF1F7',
    marginVertical: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6EFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#222B45',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});