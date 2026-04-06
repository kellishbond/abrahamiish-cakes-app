import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLORS, SCREEN_TOP_SPACE } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUSES = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];

export default function ManageOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

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
      Alert.alert('Unable to update order', error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manage Orders</Text>
      <Text style={styles.subtitle}>Update each order as it moves through fulfillment.</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No orders available yet.</Text>
        </View>
      ) : (
        orders.map(order => (
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
                <Text style={styles.currentStatus}>{order.status || 'Pending'}</Text>
              )}
            </View>

            <Text style={styles.orderItems}>
              {(order.items || [])
                .map(item => `${item.name} (${item.size}) x ${item.quantity}`)
                .join(', ')}
            </Text>

            <View style={styles.statusWrap}>
              {STATUSES.map(status => (
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
