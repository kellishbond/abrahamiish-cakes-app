import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLORS, SCREEN_TOP_SPACE } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUSES,
  getOrderProgressLabel,
  isOrderStepComplete,
} from '../../utils/orderStatus';

export default function ManageOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      snapshot => {
        const items = snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((left, right) => {
            const leftValue = left.createdAt?.seconds || 0;
            const rightValue = right.createdAt?.seconds || 0;
            return rightValue - leftValue;
          });

        setOrders(items);
        setLoading(false);
      },
      error => {
        console.error('Manage orders listener error:', error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      Alert.alert(
        'Unable to update order',
        getFriendlyErrorMessage(
          error,
          'We could not update this order right now. Please try again.'
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const normalizedQuery = search.trim().toLowerCase();
    const matchesFilter =
      activeFilter === 'All' || (order.status || 'Pending') === activeFilter;
    const matchesSearch =
      !normalizedQuery ||
      (order.customerName || 'Customer').toLowerCase().includes(normalizedQuery) ||
      order.id.toLowerCase().includes(normalizedQuery) ||
      (order.items || [])
        .map(item => item.name)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesFilter && matchesSearch;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manage Orders</Text>
      <Text style={styles.subtitle}>Update each order as it moves through fulfillment.</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by customer, order ID, or item"
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {['All', ...ORDER_STATUSES].map(status => (
          <TouchableOpacity
            key={status}
            onPress={() => setActiveFilter(status)}
            style={[
              styles.filterBtn,
              activeFilter === status && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilter === status && styles.filterBtnTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No orders match this search yet.</Text>
        </View>
      ) : (
        filteredOrders.map(order => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <View style={styles.orderMeta}>
                <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
                <Text style={styles.orderInfo}>
                  {formatDate(order.createdAt)} • {formatCurrency(order.total)}
                </Text>
              </View>
              {updatingId === order.id ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.currentStatus}>
                  {getOrderProgressLabel(order.status)}
                </Text>
              )}
            </View>

            <Text style={styles.orderItems}>
              {(order.items || [])
                .map(item => `${item.name} (${item.size}) x ${item.quantity}`)
                .join(', ')}
            </Text>

            {(order.status || 'Pending') === 'Cancelled' ? (
              <View style={styles.cancelledBanner}>
                <Text style={styles.cancelledBannerText}>
                  This order has been cancelled.
                </Text>
              </View>
            ) : (
              <View style={styles.timelineRow}>
                {ACTIVE_ORDER_STATUSES.map(step => (
                  <View key={step} style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineDot,
                        isOrderStepComplete(order.status, step) && styles.timelineDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.timelineText,
                        isOrderStepComplete(order.status, step) && styles.timelineTextActive,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.statusWrap}>
              {ORDER_STATUSES.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    order.status === status && styles.statusBtnActive,
                  ]}
                  onPress={() => updateStatus(order.id, status)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      order.status === status && styles.statusBtnTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: SCREEN_TOP_SPACE },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 18, marginTop: 6 },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filtersRow: {
    gap: 8,
    marginBottom: 18,
    paddingRight: 20,
  },
  filterBtn: {
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  filterBtnTextActive: { color: COLORS.surface },
  loader: { marginTop: 50 },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 14,
    padding: 16,
  },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderMeta: { flex: 1, paddingRight: 12 },
  customerName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  orderInfo: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  currentStatus: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  orderItems: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    backgroundColor: '#F3DED8',
    borderRadius: 999,
    height: 10,
    marginBottom: 6,
    width: 10,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
  },
  timelineText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  timelineTextActive: {
    color: COLORS.primaryDark,
  },
  cancelledBanner: {
    backgroundColor: '#FFF1EE',
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelledBannerText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBtnActive: { backgroundColor: COLORS.primary },
  statusBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  statusBtnTextActive: { color: COLORS.surface },
});
