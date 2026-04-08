import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { getPrimaryImageUrl, normalizeImageUrls } from '../../utils/productImages';
import { formatCurrency } from '../../utils/formatters';

const CATEGORIES = ['Birthday', 'Wedding', 'Custom', 'Pastries'];
const SIZES = ['Small', 'Medium', 'Large'];

const initialForm = {
  name: '',
  category: CATEGORIES[0],
  price: '',
  description: '',
  imageUrl: '',
  imageUrlsText: '',
  sizes: ['Medium'],
  inStock: true,
};

export default function AddEditProductScreen() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      snapshot => {
        const items = snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((left, right) => left.name.localeCompare(right.name));

        setProducts(items);
        setLoading(false);
      },
      error => {
        console.error('Products listener error:', error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const formTitle = useMemo(
    () => (editingId ? 'Edit product' : 'Add new product'),
    [editingId]
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const toggleSize = size => {
    setForm(current => {
      const hasSize = current.sizes.includes(size);
      return {
        ...current,
        sizes: hasSize
          ? current.sizes.filter(value => value !== size)
          : [...current.sizes, size],
      };
    });
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert(
        'Permission needed',
        'Please allow photo access to upload a cake image.'
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setUploadingImage(true);
    try {
      const selectedAsset = result.assets[0];
      const response = await fetch(selectedAsset.uri);
      const blob = await response.blob();
      const fileExtension = selectedAsset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const storageRef = ref(
        storage,
        `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`
      );

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      setForm(current => {
        const imageUrls = normalizeImageUrls({
          imageUrl: downloadUrl,
          imageUrls: current.imageUrlsText.split('\n'),
        });

        return {
          ...current,
          imageUrl: downloadUrl,
          imageUrlsText: imageUrls.join('\n'),
        };
      });
    } catch (error) {
      console.error('Image upload failed:', error?.code, error?.message, error?.serverResponse);
      Alert.alert(
        'Unable to upload image',
        getFriendlyErrorMessage(
          error,
          'We could not upload that image right now. Please try again or paste an image URL instead.'
        )
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = product => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      category: product.category || CATEGORIES[0],
      price: String(product.price || ''),
      description: product.description || '',
      imageUrl: getPrimaryImageUrl(product),
      imageUrlsText: normalizeImageUrls(product).join('\n'),
      sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Medium'],
      inStock: product.inStock ?? true,
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.price || !form.description) {
      return Alert.alert('Missing fields', 'Please complete all required product fields.');
    }

    if (!form.sizes.length) {
      return Alert.alert('Select a size', 'Choose at least one available size.');
    }

    setSaving(true);

    try {
      const imageUrls = normalizeImageUrls({
        imageUrl: form.imageUrl.trim(),
        imageUrls: form.imageUrlsText.split('\n'),
      });

      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        description: form.description.trim(),
        imageUrl: imageUrls[0] || '',
        imageUrls,
        sizes: form.sizes,
        inStock: form.inStock,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
    } catch (error) {
      Alert.alert(
        'Unable to save product',
        getFriendlyErrorMessage(
          error,
          'We could not save this product right now. Please try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Products</Text>
      <Text style={styles.subtitle}>Create new products or update your current catalog.</Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current catalog</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyText}>No products yet. Add your first cake below.</Text>
        ) : (
          products.map(product => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleEdit(product)}
            >
              <View style={styles.productImageWrap}>
                {getPrimaryImageUrl(product) ? (
                  <Image source={{ uri: getPrimaryImageUrl(product) }} style={styles.productImage} />
                ) : (
                  <Text style={styles.productEmoji}>🎂</Text>
                )}
              </View>
              <View style={styles.productMeta}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productInfo}>
                  {product.category} • {formatCurrency(product.price)}
                </Text>
                <Text style={styles.productInfo}>{(product.sizes || []).join(', ')}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>{formTitle}</Text>
          {editingId ? (
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Product name"
          placeholderTextColor="#AAA"
          value={form.name}
          onChangeText={value => setForm(current => ({ ...current, name: value }))}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.optionWrap}>
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.optionBtn,
                form.category === category && styles.optionBtnActive,
              ]}
              onPress={() => setForm(current => ({ ...current, category }))}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  form.category === category && styles.optionBtnTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Price in NGN"
          placeholderTextColor="#AAA"
          keyboardType="numeric"
          value={form.price}
          onChangeText={value => setForm(current => ({ ...current, price: value }))}
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Description"
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={4}
          value={form.description}
          onChangeText={value => setForm(current => ({ ...current, description: value }))}
        />

        <Text style={styles.label}>Available sizes</Text>
        <View style={styles.optionWrap}>
          {SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionBtn,
                form.sizes.includes(size) && styles.optionBtnActive,
              ]}
              onPress={() => toggleSize(size)}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  form.sizes.includes(size) && styles.optionBtnTextActive,
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>In stock</Text>
            <Text style={styles.helperText}>Show this product as available to customers.</Text>
          </View>
          <Switch
            value={form.inStock}
            onValueChange={value => setForm(current => ({ ...current, inStock: value }))}
            thumbColor={form.inStock ? COLORS.primary : '#F4F3F4'}
            trackColor={{ false: '#D8D8D8', true: '#F9B5A8' }}
          />
        </View>

        <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage}>
          <Text style={styles.imagePickerText}>
            {uploadingImage ? 'Uploading image...' : 'Upload from phone'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.imageHelperText}>
          Or paste a public image URL if you do not want to use Firebase Storage yet.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Paste image URL (optional)"
          placeholderTextColor="#AAA"
          autoCapitalize="none"
          keyboardType="url"
          value={form.imageUrl}
          onChangeText={value => setForm(current => ({ ...current, imageUrl: value }))}
        />

        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Additional image URLs (one per line)"
          placeholderTextColor="#AAA"
          autoCapitalize="none"
          keyboardType="url"
          multiline
          numberOfLines={4}
          value={form.imageUrlsText}
          onChangeText={value => setForm(current => ({ ...current, imageUrlsText: value }))}
        />

        {getPrimaryImageUrl({
          imageUrl: form.imageUrl,
          imageUrls: form.imageUrlsText.split('\n'),
        }) ? (
          <Image
            source={{
              uri: getPrimaryImageUrl({
                imageUrl: form.imageUrl,
                imageUrls: form.imageUrlsText.split('\n'),
              }),
            }}
            style={styles.previewImage}
          />
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploadingImage) && styles.saveBtnDisabled]}
          disabled={saving || uploadingImage}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: SCREEN_TOP_SPACE },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 18, marginTop: 6 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 16,
    padding: 18,
    ...SHADOW,
  },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  productCard: {
    alignItems: 'center',
    backgroundColor: '#FFF7F5',
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  productImageWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    height: 72,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    width: 72,
  },
  productImage: { height: '100%', width: '100%' },
  productEmoji: { fontSize: 32 },
  productMeta: { flex: 1 },
  productName: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  productInfo: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  clearText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: '#FFF7F5',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  multilineInput: { minHeight: 92, textAlignVertical: 'top' },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  helperText: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, maxWidth: 220 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  optionBtn: {
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionBtnActive: { backgroundColor: COLORS.primary },
  optionBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  optionBtnTextActive: { color: COLORS.surface },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imagePickerBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 14,
    paddingVertical: 14,
  },
  imagePickerText: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '700' },
  imageHelperText: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12, marginTop: -2 },
  previewImage: {
    borderRadius: 16,
    height: 180,
    marginBottom: 16,
    width: '100%',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: COLORS.surface, fontSize: 15, fontWeight: '700' },
});
