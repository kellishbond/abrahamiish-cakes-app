import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { getPrimaryImageUrl, normalizeImageUrls } from '../../utils/productImages';
import { formatCurrency } from '../../utils/formatters';

function getAverageRating(product) {
  if (product.reviewCount) {
    return Number(product.rating || 0);
  }

  if (Array.isArray(product.reviews) && product.reviews.length) {
    const sum = product.reviews.reduce(
      (total, review) => total + Number(review.rating || 0),
      0
    );
    return sum / product.reviews.length;
  }

  return 0;
}

export default function ProductDetailScreen({ route, navigation }) {
  const { product, products = [] } = route.params;
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useCustomer();
  const imageUrls = normalizeImageUrls(product);
  const primaryImageUrl = getPrimaryImageUrl(product);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'Regular');
  const [quantity, setQuantity] = useState(1);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(primaryImageUrl);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const totalPrice = useMemo(
    () => Number(product.price || 0) * quantity,
    [product.price, quantity]
  );
  const averageRating = useMemo(() => getAverageRating(product), [product]);
  const reviewCount = Array.isArray(product.reviews)
    ? product.reviews.length
    : Number(product.reviewCount || 0);
  const relatedProducts = useMemo(
    () =>
      products
        .filter(
          item =>
            item.id !== product.id &&
            item.category === product.category &&
            item.inStock
        )
        .slice(0, 4),
    [product.category, product.id, products]
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

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      return Alert.alert('Missing review', 'Please write a short review first.');
    }

    setSubmittingReview(true);
    try {
      await updateDoc(doc(db, product.sourceCollection || 'products', product.id), {
        reviews: arrayUnion({
          author: profile?.name || user?.displayName || 'Customer',
          comment: reviewComment.trim(),
          rating: reviewRating,
          createdAt: new Date().toISOString(),
        }),
        reviewCount: reviewCount + 1,
        rating:
          ((averageRating * reviewCount) + reviewRating) /
          Math.max(reviewCount + 1, 1),
      });

      Alert.alert('Thanks for the review', 'Your feedback has been added.');
      setReviewComment('');
      setReviewRating(5);
    } catch (error) {
      Alert.alert(
        'Unable to submit review',
        getFriendlyErrorMessage(
          error,
          'We could not save your review right now. Please try again.'
        )
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      <View style={styles.imageArea}>
        {activeImage ? (
          <TouchableOpacity
            activeOpacity={0.96}
            onPress={() => setIsImageViewerOpen(true)}
            style={styles.heroImageButton}
          >
            <Image source={{ uri: activeImage }} style={styles.heroImage} />
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

        <TouchableOpacity
          style={styles.favoriteFloatingBtn}
          onPress={() => toggleFavorite(product.id)}
        >
          <Text style={styles.favoriteFloatingText}>
            {isFavorite(product.id) ? '♥' : '♡'}
          </Text>
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
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: imageUrls.indexOf(activeImage) * 320, y: 0 }}
            style={styles.viewerCarousel}
          >
            {(imageUrls.length ? imageUrls : [activeImage]).map(image => (
              <View key={image} style={styles.viewerSlide}>
                <Image resizeMode="contain" source={{ uri: image }} style={styles.viewerImage} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{product.category || 'Cake'}</Text>
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>

        <View style={styles.ratingSummary}>
          <Text style={styles.ratingValue}>
            {reviewCount ? `★ ${averageRating.toFixed(1)}` : 'New arrival'}
          </Text>
          <Text style={styles.ratingMeta}>
            {reviewCount ? `${reviewCount} review(s)` : 'No reviews yet'}
          </Text>
        </View>

        {imageUrls.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>More photos</Text>
            <FlatList
              data={imageUrls}
              horizontal
              keyExtractor={item => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setActiveImage(item)}
                  style={[
                    styles.galleryThumbWrap,
                    activeImage === item && styles.galleryThumbWrapActive,
                  ]}
                >
                  <Image source={{ uri: item }} style={styles.galleryThumb} />
                </TouchableOpacity>
              )}
            />
          </>
        )}

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

        <View style={styles.reviewCard}>
          <Text style={styles.sectionTitle}>Reviews and ratings</Text>
          {Array.isArray(product.reviews) && product.reviews.length > 0 ? (
            product.reviews.slice(-3).reverse().map((review, index) => (
              <View key={`${review.author}-${index}`} style={styles.reviewItem}>
                <Text style={styles.reviewAuthor}>
                  {review.author || 'Customer'} • {'★'.repeat(Number(review.rating || 0))}
                </Text>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.reviewEmptyText}>
              No reviews yet. Be the first customer to leave one.
            </Text>
          )}

          <View style={styles.reviewComposer}>
            <Text style={styles.reviewComposerLabel}>Leave a quick review</Text>
            <View style={styles.ratingPickerRow}>
              {[1, 2, 3, 4, 5].map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setReviewRating(value)}
                  style={styles.ratingStarBtn}
                >
                  <Text
                    style={[
                      styles.ratingStarText,
                      reviewRating >= value && styles.ratingStarTextActive,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="What did you love about this cake?"
              placeholderTextColor="#AAA"
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={submittingReview}
              style={styles.reviewSubmitBtn}
            >
              <Text style={styles.reviewSubmitText}>
                {submittingReview ? 'Submitting...' : 'Submit review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Related cakes</Text>
            <FlatList
              data={relatedProducts}
              horizontal
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.relatedCard}
                  onPress={() =>
                    navigation.push('ProductDetail', {
                      product: item,
                      products,
                    })
                  }
                >
                  <Image
                    source={{ uri: getPrimaryImageUrl(item) }}
                    style={styles.relatedImage}
                  />
                  <Text style={styles.relatedName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.relatedPrice}>{formatCurrency(item.price)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

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
  heroImageButton: { height: '100%', width: '100%' },
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
  favoriteFloatingBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: SCREEN_TOP_SPACE - 4,
    width: 40,
    ...SHADOW,
  },
  favoriteFloatingText: { color: COLORS.primaryDark, fontSize: 20, fontWeight: '700' },
  viewerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.94)',
    flex: 1,
    justifyContent: 'center',
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
    marginRight: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  viewerCloseText: { color: COLORS.surface, fontSize: 13, fontWeight: '700' },
  viewerCarousel: { flex: 1, width: '100%' },
  viewerSlide: { alignItems: 'center', justifyContent: 'center', width: 360 },
  viewerImage: { height: '100%', width: '100%' },
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
  price: { color: COLORS.primary, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  ratingSummary: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  ratingValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  ratingMeta: { color: COLORS.textMuted, fontSize: 13 },
  galleryRow: { gap: 10, marginBottom: 18 },
  galleryThumbWrap: {
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    height: 74,
    marginRight: 10,
    overflow: 'hidden',
    width: 74,
  },
  galleryThumbWrapActive: { borderColor: COLORS.primary },
  galleryThumb: { height: '100%', width: '100%' },
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
  stockRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 18 },
  stockDot: { borderRadius: 999, height: 10, width: 10 },
  stockText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 18,
    padding: 16,
    ...SHADOW,
  },
  reviewItem: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 12,
  },
  reviewAuthor: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  reviewComment: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  reviewEmptyText: { color: COLORS.textMuted, fontSize: 13, marginBottom: 14 },
  reviewComposer: { marginTop: 8 },
  reviewComposerLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  ratingPickerRow: { flexDirection: 'row', marginBottom: 12 },
  ratingStarBtn: { marginRight: 6 },
  ratingStarText: { color: '#D9C0B9', fontSize: 24 },
  ratingStarTextActive: { color: COLORS.warning },
  reviewInput: {
    backgroundColor: '#FFF7F5',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 90,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  reviewSubmitBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  reviewSubmitText: { color: COLORS.surface, fontSize: 14, fontWeight: '700' },
  relatedSection: { marginBottom: 12 },
  relatedRow: { paddingBottom: 6 },
  relatedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginRight: 12,
    overflow: 'hidden',
    width: 148,
    ...SHADOW,
  },
  relatedImage: { height: 100, width: '100%' },
  relatedName: { color: COLORS.text, fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingTop: 10 },
  relatedPrice: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 6,
  },
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
