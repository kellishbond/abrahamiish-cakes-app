import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'Regular');
  const [quantity, setQuantity] = useState(1);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const totalPrice = useMemo(
    () => Number(product.price || 0) * quantity,
    [product.price, quantity]
  );

  const handleAddToCart = () => {
    for (let count = 0; count < quantity; count += 1) {
      addToCart(product, selectedSize);
    }

    Alert.alert('Added to cart', `${product.name} is ready in your cart.`, [
      { text: 'Keep shopping', style: 'cancel' },
      {
        text: 'Go to cart',
        onPress: () => navigation.navigate('CustomerTabs', { screen: 'CartTab' }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      <View style={styles.imageArea}>
        {product.imageUrl ? (
          <TouchableOpacity
            activeOpacity={0.96}
            onPress={() => setIsImageViewerOpen(true)}
            style={styles.heroImageButton}
          >
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />
            <View style={styles.zoomHint}>
              <Text style={styles.zoomHintText}>Tap image to view</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.emoji}>Cake</Text>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isImageViewerOpen}
        onRequestClose={() => setIsImageViewerOpen(false)}
      >
        <View style={styles.viewerOverlay}>
          <Pressable
            style={styles.viewerBackdrop}
            onPress={() => setIsImageViewerOpen(false)}
          />
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setIsImageViewerOpen(false)}
          >
            <Text style={styles.viewerCloseText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.viewerImageWrap}>
            <Image
              resizeMode="contain"
              source={{ uri: product.imageUrl }}
              style={styles.viewerImage}
            />
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{product.category || 'Cake'}</Text>
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {product.description || 'Freshly baked and made with care.'}
        </Text>

        {product.sizes?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Select size</Text>
            <View style={styles.sizesRow}>
              {product.sizes.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeBtn,
                    selectedSize === size && styles.sizeBtnActive,
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selectedSize === size && styles.sizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Quantity</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(current => Math.max(1, current - 1))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(current => current + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stockRow}>
          <View
            style={[
              styles.stockDot,
              { backgroundColor: product.inStock ? COLORS.success : COLORS.danger },
            ]}
          />
          <Text style={styles.stockText}>
            {product.inStock ? 'Available for order' : 'Currently unavailable'}
          </Text>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, !product.inStock && styles.addBtnDisabled]}
          onPress={handleAddToCart}
          disabled={!product.inStock}
        >
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  imageArea: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    height: 290,
    justifyContent: 'center',
  },
  heroImageButton: {
    height: '100%',
    width: '100%',
  },
  heroImage: { height: '100%', width: '100%' },
  emoji: { fontSize: 48, fontWeight: '700' },
  zoomHint: {
    backgroundColor: 'rgba(26, 26, 26, 0.66)',
    borderRadius: 999,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
    right: 18,
  },
  zoomHintText: { color: COLORS.surface, fontSize: 12, fontWeight: '700' },
  backBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    left: 20,
    position: 'absolute',
    top: SCREEN_TOP_SPACE - 4,
    width: 40,
    ...SHADOW,
  },
  backText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  viewerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.94)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: SCREEN_TOP_SPACE,
  },
  viewerBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  viewerCloseBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  viewerCloseText: { color: COLORS.surface, fontSize: 13, fontWeight: '700' },
  viewerImageWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  viewerImage: {
    height: '100%',
    width: '100%',
  },
  details: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  name: { color: COLORS.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  price: { color: COLORS.primary, fontSize: 22, fontWeight: '700', marginBottom: 18 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  sizesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  sizeBtn: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sizeBtnActive: { backgroundColor: COLORS.card, borderColor: COLORS.primary },
  sizeText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  sizeTextActive: { color: COLORS.primary },
  qtyRow: { alignItems: 'center', flexDirection: 'row', gap: 16, marginBottom: 18 },
  qtyBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  qtyBtnText: { color: COLORS.primary, fontSize: 20, fontWeight: '700' },
  qtyValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  stockRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  stockDot: { borderRadius: 999, height: 10, width: 10 },
  stockText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  footerSpacer: { height: 110 },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 12 },
  totalPrice: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addBtnDisabled: { backgroundColor: '#D7D7D7' },
  addBtnText: { color: COLORS.surface, fontSize: 15, fontWeight: '700' },
});
