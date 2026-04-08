import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { getOrderProgressLabel, ACTIVE_ORDER_STATUSES, isOrderStepComplete } from '../../utils/orderStatus';
import { getPrimaryImageUrl } from '../../utils/productImages';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters';

const ORDERS_PER_PAGE = 5;
const PRODUCT_COLLECTION_CANDIDATES = ['products', 'products ', 'Products'];

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

export default function ProfileScreen({ route, navigation }) {
  const adminMode = route?.params?.adminMode;
  const { logout, profile, user } = useAuth();
  const { addItemsToCart } = useCart();
  const {
    favorites,
    notificationsEnabled,
    pushToken,
    savedAddresses,
    updateCustomerPreferences,
  } = useCustomer();
  const [orders, setOrders] = useState([]);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);

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
    if (adminMode || favorites.length === 0) {
      setFavoriteProducts([]);
      setLoadingFavorites(false);
      return undefined;
    }

    let activeUnsubscribe = null;

    const subscribe = index => {
      const collectionName = PRODUCT_COLLECTION_CANDIDATES[index];

      activeUnsubscribe = onSnapshot(
        collection(db, collectionName),
        snapshot => {
          const items = snapshot.docs
            .map(docSnapshot => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
              sourceCollection: docSnapshot.ref.parent.id,
            }))
            .filter(item => favorites.includes(item.id));

          if (!items.length && index + 1 < PRODUCT_COLLECTION_CANDIDATES.length) {
            activeUnsubscribe?.();
            subscribe(index + 1);
            return;
          }

          setFavoriteProducts(items);
          setLoadingFavorites(false);
        },
        () => {
          setLoadingFavorites(false);
        }
      );
    };

    subscribe(0);

    return () => {
      activeUnsubscribe?.();
    };
  }, [adminMode, favorites]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length, adminMode]);

  const profileName =
    profile?.name?.trim() ||
    user?.displayName?.trim() ||
    formatNameFromEmail(profile?.email || user?.email || '');
  const profileEmail = profile?.email || user?.email || 'No email';
  const activeOrders = useMemo(
    () =>
      orders.filter(order => !['Delivered', 'Cancelled'].includes(order.status || 'Pending'))
        .length,
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
      Alert.alert(
        'Unable to log out',
        getFriendlyErrorMessage(
          error,
          'We could not log you out right now. Please try again.'
        )
      );
    }
  };

  const handleReorder = order => {
    addItemsToCart(order.items || []);
    Alert.alert('Items added', 'This order has been added back to your cart.', [
      { text: 'Keep browsing', style: 'cancel' },
      {
        text: 'Go to cart',
        onPress: () => navigation.navigate('CartTab'),
      },
    ]);
  };

  const handleToggleNotifications = async value => {
    setUpdatingNotifications(true);
    try {
      if (value) {
        const token = await registerForPushNotificationsAsync();
        await updateCustomerPreferences({
          notificationsEnabled: Boolean(token),
          pushToken: token,
        });

        if (!token) {
          Alert.alert(
            'Permission needed',
            'Push notifications need device permission before they can be enabled.'
          );
        }
      } else {
        await updateCustomerPreferences({
          notificationsEnabled: false,
          pushToken: '',
        });
      }
    } catch (error) {
      Alert.alert(
        'Unable to update notifications',
        getFriendlyErrorMessage(
          error,
          'We could not update your notification preference right now. Please try again.'
        )
      );
    } finally {
      setUpdatingNotifications(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
              <Text style={styles.statValue}>{activeOrders}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completedOrders}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wishlist</Text>
              <Text style={styles.sectionHint}>{favorites.length} saved</Text>
            </View>

            {loadingFavorites ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : favoriteProducts.length === 0 ? (
              <Text style={styles.emptyText}>
                Save cakes you love from the home screen and they will show here.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {favoriteProducts.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.favoriteCard}
                    onPress={() =>
                      navigation.navigate('ProductDetail', {
                        product: item,
                        products: favoriteProducts,
                      })
                    }
                  >
                    <Image
                      source={{ uri: getPrimaryImageUrl(item) }}
                      style={styles.favoriteImage}
                    />
                    <Text style={styles.favoriteName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.favoritePrice}>{formatCurrency(item.price)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery preferences</Text>
              <Text style={styles.sectionHint}>{savedAddresses.length} address(es)</Text>
            </View>

            {savedAddresses.length === 0 ? (
              <Text style={styles.emptyText}>
                Your saved delivery addresses will appear here after checkout.
              </Text>
            ) : (
              savedAddresses.map(item => (
                <View key={`${item.label}-${item.address}`} style={styles.addressCard}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  <Text style={styles.addressText}>{item.address}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order updates</Text>
              <Text style={styles.sectionHint}>
                {notificationsEnabled ? 'Enabled' : 'Off'}
              </Text>
            </View>

            <View style={styles.notificationRow}>
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>Push notifications</Text>
                <Text style={styles.notificationText}>
                  Get updates when your order moves from baking to delivery.
                </Text>
                {pushToken ? (
                  <Text style={styles.notificationMeta}>Device ready for notifications</Text>
                ) : null}
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={updatingNotifications}
                thumbColor={notificationsEnabled ? COLORS.primary : '#F4F3F4'}
                trackColor={{ false: '#D8D8D8', true: '#F9B5A8' }}
              />
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
                        <Text style={styles.statusText}>{getOrderProgressLabel(order.status)}</Text>
                      </View>
                    </View>

                    <Text style={styles.orderItems}>
                      {(order.items || [])
                        .map(item => `${item.name} x ${item.quantity}`)
                        .join(', ')}
                    </Text>

                    {(order.status || 'Pending') === 'Cancelled' ? (
                      <View style={styles.cancelledBanner}>
                        <Text style={styles.cancelledBannerText}>This order was cancelled.</Text>
                      </View>
                    ) : (
                      <View style={styles.timelineRow}>
                        {ACTIVE_ORDER_STATUSES.map(step => (
                          <View key={step} style={styles.timelineStep}>
                            <View
                              style={[
                                styles.timelineDot,
                                isOrderStepComplete(order.status, step) &&
                                  styles.timelineDotActive,
                              ]}
                            />
                            <Text
                              style={[
                                styles.timelineText,
                                isOrderStepComplete(order.status, step) &&
                                  styles.timelineTextActive,
                              ]}
                            >
                              {step}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.orderFooter}>
                      <View>
                        <Text style={styles.orderFooterLabel}>Order total</Text>
                        <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => handleReorder(order)}
                      >
                        <Text style={styles.reorderBtnText}>Reorder</Text>
                      </TouchableOpacity>
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
                      onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
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
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  statCardPrimary: { backgroundColor: COLORS.primary, ...SHADOW },
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
  favoriteCard: {
    backgroundColor: '#FFF7F5',
    borderRadius: 18,
    marginRight: 12,
    overflow: 'hidden',
    width: 152,
  },
  favoriteImage: { height: 96, width: '100%' },
  favoriteName: { color: COLORS.text, fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingTop: 10 },
  favoritePrice: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  addressCard: {
    backgroundColor: '#FFF7F5',
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
  },
  addressLabel: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  addressText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  notificationRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  notificationCopy: { flex: 1, paddingRight: 14 },
  notificationTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  notificationText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  notificationMeta: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700', marginTop: 6 },
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
  timelineRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineDot: {
    backgroundColor: '#F3DED8',
    borderRadius: 999,
    height: 9,
    marginBottom: 6,
    width: 9,
  },
  timelineDotActive: { backgroundColor: COLORS.primary },
  timelineText: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  timelineTextActive: { color: COLORS.primaryDark },
  cancelledBanner: {
    backgroundColor: '#FFF1EE',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelledBannerText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  orderFooter: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  orderFooterLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  orderTotal: { color: COLORS.primary, fontSize: 16, fontWeight: '800', marginTop: 4 },
  reorderBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reorderBtnText: { color: COLORS.surface, fontSize: 12, fontWeight: '800' },
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
  paginationBtnDisabled: { backgroundColor: '#F7F2F0' },
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
