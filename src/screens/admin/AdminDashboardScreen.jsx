import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function AdminDashboardScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
        console.error('Admin orders listener error:', error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const totalRevenue = useMemo(
    () =>
      orders
        .filter(order => order.status !== 'Cancelled')
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(order => !['Delivered', 'Cancelled'].includes(order.status || 'Pending'))
        .length,
    [orders]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>A quick look at orders and revenue.</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{orders.length}</Text>
          <Text style={styles.metricLabel}>Total orders</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{activeOrders}</Text>
          <Text style={styles.metricLabel}>Active</Text>
        </View>
      </View>

      <View style={styles.metricCardWide}>
        <Text style={styles.metricWideLabel}>Total revenue</Text>
        <Text style={styles.metricWideValue}>{formatCurrency(totalRevenue)}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent orders</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>Orders will appear here once customers start buying.</Text>
        ) : (
          orders.slice(0, 6).map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderRow}>
                <View>
                  <Text style={styles.orderName}>{order.customerName || 'Customer'}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
              </View>

              <Text style={styles.orderItems}>
                {(order.items || [])
                  .map(item => `${item.name} x ${item.quantity}`)
                  .join(', ')}
              </Text>
              <Text style={styles.orderStatus}>Status: {order.status || 'Pending'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: SCREEN_TOP_SPACE },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 18, marginTop: 6 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flex: 1,
    padding: 18,
    ...SHADOW,
  },
  metricValue: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  metricLabel: { color: COLORS.textMuted, fontSize: 13 },
  metricCardWide: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    marginBottom: 18,
    padding: 20,
  },
  metricWideLabel: { color: '#FFECE7', fontSize: 13, marginBottom: 6 },
  metricWideValue: { color: COLORS.surface, fontSize: 28, fontWeight: '700' },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22 },
  orderCard: {
    backgroundColor: '#FFF7F5',
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  orderDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  orderTotal: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  orderItems: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  orderStatus: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
});
