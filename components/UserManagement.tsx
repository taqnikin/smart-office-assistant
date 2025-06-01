// Smart Office Assistant - User Management Component
// Comprehensive user management interface for admin dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, User, EmployeeDetails } from '../lib/supabase-api';
import { validationService } from '../services/ValidationService';
import { errorLogger, ErrorCategory, ErrorSeverity } from '../services/ErrorLoggingService';
import { UserForm } from './UserForm';

interface UserWithDetails extends User {
  employee_details?: EmployeeDetails[];
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
  adminUsers: number;
  usersByRole: Record<string, number>;
  usersByDepartment: Record<string, number>;
  usersByWorkMode: Record<string, number>;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'deleted' | 'admin'>('active');

  useEffect(() => {
    loadUsers();
    loadUserStats();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, activeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const includeDeleted = activeFilter === 'deleted' || activeFilter === 'all';
      const userData = await adminAPI.getAllUsers(includeDeleted);
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      await errorLogger.logError(error as Error, {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.API,
        context: {
          screen: 'UserManagement',
          action: 'loadUsers'
        }
      });
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const stats = await adminAPI.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadUserStats()]);
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply active filter
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(user => !user.deleted);
        break;
      case 'deleted':
        filtered = filtered.filter(user => user.deleted);
        break;
      case 'admin':
        filtered = filtered.filter(user => user.role === 'admin' && !user.deleted);
        break;
      // 'all' shows everything
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const employeeDetails = user.employee_details?.[0];
        return (
          user.email.toLowerCase().includes(query) ||
          employeeDetails?.full_name?.toLowerCase().includes(query) ||
          employeeDetails?.employee_id?.toLowerCase().includes(query) ||
          employeeDetails?.department?.toLowerCase().includes(query) ||
          employeeDetails?.position?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action can be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.softDeleteUser(userId);
              await loadUsers();
              await loadUserStats();
            } catch (error) {
              console.error('Failed to delete user:', error);
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await adminAPI.restoreUser(userId);
      await loadUsers();
      await loadUserStats();
    } catch (error) {
      console.error('Failed to restore user:', error);
      Alert.alert('Error', 'Failed to restore user. Please try again.');
    }
  };

  const handleBulkAction = async (action: 'delete' | 'restore' | 'makeAdmin' | 'makeUser') => {
    if (selectedUsers.size === 0) {
      Alert.alert('No Selection', 'Please select users to perform bulk actions.');
      return;
    }

    const userIds = Array.from(selectedUsers);
    let actionText = '';
    let updates: any = {};

    switch (action) {
      case 'delete':
        actionText = 'delete';
        updates = { deleted: true };
        break;
      case 'restore':
        actionText = 'restore';
        updates = { deleted: false };
        break;
      case 'makeAdmin':
        actionText = 'make admin';
        updates = { role: 'admin' };
        break;
      case 'makeUser':
        actionText = 'make user';
        updates = { role: 'user' };
        break;
    }

    Alert.alert(
      'Bulk Action',
      `Are you sure you want to ${actionText} ${userIds.length} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminAPI.bulkUpdateUsers(userIds, updates);
              setSelectedUsers(new Set());
              await loadUsers();
              await loadUserStats();
            } catch (error) {
              console.error('Failed to perform bulk action:', error);
              Alert.alert('Error', 'Failed to perform bulk action. Please try again.');
            }
          }
        }
      ]
    );
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const renderUserStats = () => {
    if (!userStats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats.activeUsers}</Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats.adminUsers}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats.deletedUsers}</Text>
          <Text style={styles.statLabel}>Deleted</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'active', label: 'Active', count: userStats?.activeUsers },
        { key: 'admin', label: 'Admins', count: userStats?.adminUsers },
        { key: 'deleted', label: 'Deleted', count: userStats?.deletedUsers },
        { key: 'all', label: 'All', count: userStats?.totalUsers }
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[styles.filterTab, activeFilter === filter.key && styles.activeFilterTab]}
          onPress={() => setActiveFilter(filter.key as any)}
        >
          <Text style={[styles.filterTabText, activeFilter === filter.key && styles.activeFilterTabText]}>
            {filter.label}
          </Text>
          {filter.count !== undefined && (
            <Text style={[styles.filterTabCount, activeFilter === filter.key && styles.activeFilterTabCount]}>
              {filter.count}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSearchAndActions = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingUser(null);
          setShowUserForm(true);
        }}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add User</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBulkActions = () => {
    if (selectedUsers.size === 0) return null;

    return (
      <View style={styles.bulkActionsContainer}>
        <TouchableOpacity style={styles.bulkActionButton} onPress={selectAllUsers}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#4A80F0" />
          <Text style={styles.bulkActionText}>
            {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={() => handleBulkAction('makeAdmin')}
        >
          <Ionicons name="shield-outline" size={16} color="#34C759" />
          <Text style={styles.bulkActionText}>Make Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={() => handleBulkAction('makeUser')}
        >
          <Ionicons name="person-outline" size={16} color="#007AFF" />
          <Text style={styles.bulkActionText}>Make User</Text>
        </TouchableOpacity>

        {activeFilter === 'deleted' ? (
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={() => handleBulkAction('restore')}
          >
            <Ionicons name="refresh-outline" size={16} color="#34C759" />
            <Text style={styles.bulkActionText}>Restore</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={() => handleBulkAction('delete')}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            <Text style={styles.bulkActionText}>Delete</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.selectedCount}>{selectedUsers.size} selected</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderUserStats()}
      {renderFilterTabs()}
      {renderSearchAndActions()}
      {renderBulkActions()}

      <ScrollView
        style={styles.usersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            isSelected={selectedUsers.has(user.id)}
            onSelect={() => toggleUserSelection(user.id)}
            onEdit={() => {
              setEditingUser(user);
              setShowUserForm(true);
            }}
            onDelete={() => handleDeleteUser(user.id)}
            onRestore={() => handleRestoreUser(user.id)}
          />
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#999" />
            <Text style={styles.emptyStateText}>No users found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Add your first user to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      <UserForm
        visible={showUserForm}
        user={editingUser}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        onSave={async () => {
          await loadUsers();
          await loadUserStats();
        }}
      />
    </View>
  );
};

// UserCard component will be implemented in the next part
const UserCard: React.FC<{
  user: UserWithDetails;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}> = ({ user, isSelected, onSelect, onEdit, onDelete, onRestore }) => {
  const employeeDetails = user.employee_details?.[0];

  return (
    <View style={[styles.userCard, user.deleted && styles.deletedUserCard]}>
      <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={20}
          color={isSelected ? "#4A80F0" : "#999"}
        />
      </TouchableOpacity>

      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={[styles.userName, user.deleted && styles.deletedText]}>
            {employeeDetails?.full_name || 'No Name'}
          </Text>
          <View style={[styles.roleBadge, user.role === 'admin' && styles.adminBadge]}>
            <Text style={[styles.roleText, user.role === 'admin' && styles.adminRoleText]}>
              {user.role}
            </Text>
          </View>
        </View>

        <Text style={[styles.userEmail, user.deleted && styles.deletedText]}>
          {user.email}
        </Text>

        {employeeDetails && (
          <View style={styles.userDetails}>
            <Text style={[styles.userDetailText, user.deleted && styles.deletedText]}>
              ID: {employeeDetails.employee_id}
            </Text>
            {employeeDetails.department && (
              <Text style={[styles.userDetailText, user.deleted && styles.deletedText]}>
                {employeeDetails.department}
              </Text>
            )}
            {employeeDetails.position && (
              <Text style={[styles.userDetailText, user.deleted && styles.deletedText]}>
                {employeeDetails.position}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={16} color="#4A80F0" />
        </TouchableOpacity>

        {user.deleted ? (
          <TouchableOpacity style={styles.actionButton} onPress={onRestore}>
            <Ionicons name="refresh-outline" size={16} color="#34C759" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#4A80F0',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  filterTabCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activeFilterTabCount: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222B45',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A80F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    gap: 16,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkActionText: {
    fontSize: 14,
    color: '#4A80F0',
  },
  selectedCount: {
    marginLeft: 'auto',
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    gap: 12,
  },
  deletedUserCard: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  selectButton: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
  },
  deletedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
  },
  adminBadge: {
    backgroundColor: '#4A80F0',
  },
  roleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  adminRoleText: {
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  userDetailText: {
    fontSize: 12,
    color: '#999',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default UserManagement;
