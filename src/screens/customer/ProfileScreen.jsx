import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters';

const ORDERS_PER_PAGE = 5;

function formatNameFromEmail(email = '') {
  const base = email.split('@')[0];

  if (!base) {
    return 'Customer';
  }

  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ProfileScreen({ route }) {
  const adminMode = route?.params?.adminMode;
  const { logout, profile, role, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?.uid || adminMode) {
      setOrders([]);
      setLoadingOrders(false);
      return undefined;
    }

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      ordersQuery,
      snapshot => {
        const items = snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((left, right) => {
            const leftValue = left.createdAt?.seconds || 0;
            const rightValue = right.createdAt?.seconds || 0;
            return rightValue - leftValue;
          });

        setOrders(items);
        setLoadingOrders(false);
      },
      error => {
        console.error('Orders listener error:', error.message);
        setLoadingOrders(false);
      }
    );

    return unsubscribe;
  }, [adminMode, user?.uid]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length, adminMode]);

  const profileName =
    profile?.name?.trim() ||
    user?.displayName?.trim() ||
    formatNameFromEmail(profile?.email || user?.email || '');
  const profileEmail = profile?.email || user?.email || 'No email';
  const pendingOrders = useMemo(
    () => orders.filter(order => order.status === 'Pending').length,
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter(order => order.status === 'Delivered').length,
    [orders]
  );
  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [currentPage, orders]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Logout failed', error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
        </View>
        <Text style={styles.name}>
          {adminMode ? 'Abrahamiish Admin' : 'Abrahamiish Customer'}
        </Text>
        <Text style={styles.email}>{profileEmail}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>
            {adminMode ? 'Admin Settings' : profileName}
          </Text>
        </View>
      </View>

      {!adminMode && (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Text style={styles.statValueLight}>{orders.length}</Text>
              <Text style={styles.statLabelLight}>Total orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pendingOrders}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completedOrders}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Orders</Text>
              <Text style={styles.sectionHint}>
                {orders.length ? `${orders.length} order(s)` : 'No orders yet'}
              </Text>
            </View>

            {loadingOrders ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No orders yet</Text>
                <Text style={styles.emptyText}>
                  Once you place an order, it will appear here with its status and total.
                </Text>
              </View>
            ) : (
              <>
                {paginatedOrders.map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View style={styles.orderMeta}>
                      <Text style={styles.orderId}>Order #{order.id.slice(0, 6)}</Text>
                      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{order.status || 'Pending'}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderItems}>
                    {(order.items || [])
                      .map(item => `${item.name} x ${item.quantity}`)
                      .join(', ')}
                  </Text>

                  <View style={styles.orderFooter}>
                    <Text style={styles.orderFooterLabel}>Order total</Text>
                    <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                  </View>
                </View>
                ))}

                {totalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                      style={[
                        styles.paginationBtn,
                        currentPage === 1 && styles.paginationBtnDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paginationBtnText,
                          currentPage === 1 && styles.paginationBtnTextDisabled,
                        ]}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.paginationText}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      disabled={currentPage === totalPages}
                      onPress={() =>
                        setCurrentPage(page => Math.min(totalPages, page + 1))
                      }
                      style={[
                        styles.paginationBtn,
                        currentPage === totalPages && styles.paginationBtnDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paginationBtnText,
                          currentPage === totalPages && styles.paginationBtnTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </>
      )}

      {adminMode && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Admin notes</Text>
          <Text style={styles.emptyText}>
            Use the Dashboard, Products, and Orders tabs to manage the business.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: SCREEN_TOP_SPACE },
  heroCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    ...SHADOW,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    marginBottom: 16,
    width: 76,
  },
  avatarText: { color: COLORS.primaryDark, fontSize: 24, fontWeight: '800' },
  name: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  email: { color: COLORS.textMuted, fontSize: 14 },
  rolePill: {
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rolePillText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  statCardPrimary: {
    backgroundColor: COLORS.primary,
    ...SHADOW,
  },
  statValue: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  statLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  statValueLight: { color: COLORS.surface, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  statLabelLight: { color: '#FDE0D9', fontSize: 12, fontWeight: '700' },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginTop: 18,
    padding: 18,
    ...SHADOW,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  sectionHint: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFF7F5',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  emptyStateTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#FFF7F5',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  orderTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderMeta: { flex: 1, paddingRight: 12 },
  orderId: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  orderDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  statusPill: {
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  orderItems: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  orderFooter: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  orderFooterLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  orderTotal: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  paginationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  paginationBtn: {
    alignItems: 'center',
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paginationBtnDisabled: {
    backgroundColor: '#F7F2F0',
  },
  paginationBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  paginationBtnTextDisabled: { color: COLORS.textMuted },
  paginationText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.text,
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 17,
  },
  logoutText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
});
