import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import {
  COLORS,
  DELIVERY_FEE,
  SCREEN_TOP_SPACE,
  SHADOW,
} from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';

export default function CartScreen({ navigation }) {
  const { cartItems, itemCount, removeFromCart, total, updateQuantity } = useCart();
  const grandTotal = total + (cartItems.length ? DELIVERY_FEE : 0);

  if (!cartItems.length) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyHeader}>
          <Text style={styles.title}>Your cart</Text>
          <Text style={styles.subtitle}>Nothing here yet, but something sweet is waiting.</Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyEmoji}>🧁</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Add something sweet from the home screen to get started.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.primaryBtnText}>Browse cakes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your cart</Text>
            <Text style={styles.subtitle}>{itemCount} item(s) ready for checkout</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{itemCount}</Text>
          </View>
        </View>

        <View style={styles.itemsSection}>
          {cartItems.map(item => (
            <View key={`${item.id}-${item.size}`} style={styles.card}>
              <View style={styles.imageWrap}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                  <Text style={styles.imageEmoji}>🎂</Text>
                )}
              </View>

              <View style={styles.itemBody}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.metaPills}>
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{item.size}</Text>
                      </View>
                      <View style={styles.metaPillMuted}>
                        <Text style={styles.metaPillMutedText}>Qty {item.quantity}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id, item.size)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>

                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                    >
                      <Text style={styles.quantityBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.summaryWrap}>
        <View style={styles.summaryHandle} />
        <Text style={styles.summaryTitle}>Payment summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(DELIVERY_FEE)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.primaryBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 260, paddingTop: SCREEN_TOP_SPACE },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 6 },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerBadgeText: { color: COLORS.primaryDark, fontSize: 15, fontWeight: '800' },
  itemsSection: { gap: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOW,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    minHeight: 134,
    width: 108,
  },
  image: { height: '100%', width: '100%' },
  imageEmoji: { fontSize: 42 },
  itemBody: { flex: 1, justifyContent: 'space-between', padding: 14 },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  itemMeta: { flex: 1, paddingRight: 10 },
  itemName: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: {
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '700' },
  metaPillMuted: {
    backgroundColor: '#F7F2F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillMutedText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  deleteBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  itemBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemPrice: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  quantityRow: {
    alignItems: 'center',
    backgroundColor: '#FFF7F5',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quantityBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  quantityBtnText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  quantityValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
  },
  summaryWrap: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    ...SHADOW,
  },
  summaryHandle: {
    alignSelf: 'center',
    backgroundColor: '#E9D7D1',
    borderRadius: 999,
    height: 5,
    marginBottom: 14,
    width: 54,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: 14 },
  summaryValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  summaryDivider: {
    backgroundColor: COLORS.border,
    height: 1,
    marginBottom: 14,
    marginTop: 6,
  },
  totalLabel: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  totalValue: { color: COLORS.primary, fontSize: 21, fontWeight: '800' },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    marginTop: 16,
    paddingVertical: 17,
  },
  primaryBtnText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
  emptyContainer: {
    backgroundColor: COLORS.background,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: SCREEN_TOP_SPACE,
  },
  emptyHeader: {
    marginBottom: 22,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 30,
    ...SHADOW,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 18,
    width: 80,
  },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
    textAlign: 'center',
  },
});
