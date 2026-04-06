import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { COLORS, SCREEN_TOP_SPACE, SHADOW } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';

const CATEGORIES = ['All', 'Birthday', 'Wedding', 'Custom', 'Pastries'];
const PRODUCT_COLLECTION_CANDIDATES = ['products', 'products ', 'Products'];

function normalizeProduct(docSnapshot) {
  const data = docSnapshot.data();

  return {
    id: docSnapshot.id,
    name: data.name || '',
    category: data.category || '',
    price: Number(data.price || 0),
    description: data.description || '',
    imageUrl: data.imageUrl || '',
    inStock: data.inStock ?? true,
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
  };
}

function parseFirestoreValue(field) {
  if (!field) {
    return null;
  }

  if (field.stringValue !== undefined) {
    return field.stringValue;
  }

  if (field.integerValue !== undefined || field.doubleValue !== undefined) {
    return Number(field.integerValue ?? field.doubleValue ?? 0);
  }

  if (field.booleanValue !== undefined) {
    return field.booleanValue;
  }

  if (field.arrayValue?.values) {
    return field.arrayValue.values.map(parseFirestoreValue);
  }

  if (field.mapValue?.fields) {
    return Object.fromEntries(
      Object.entries(field.mapValue.fields).map(([key, value]) => [
        key,
        parseFirestoreValue(value),
      ])
    );
  }

  return null;
}

function normalizeRestProduct(document) {
  const fields = document.fields || {};

  return {
    id: document.name.split('/').pop(),
    name: parseFirestoreValue(fields.name) || '',
    category: parseFirestoreValue(fields.category) || '',
    price: Number(parseFirestoreValue(fields.price) || 0),
    description: parseFirestoreValue(fields.description) || '',
    imageUrl: parseFirestoreValue(fields.imageUrl) || '',
    inStock: parseFirestoreValue(fields.inStock) ?? true,
    sizes: parseFirestoreValue(fields.sizes) || [],
  };
}

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const { profile } = useAuth();
  const { itemCount } = useCart();

  const firstName = profile?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    let isActive = true;
    let fallbackAttempted = false;

    const fetchProductsFromRest = async reason => {
      if (!isActive || fallbackAttempted) {
        return;
      }

      fallbackAttempted = true;

      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        let items = [];

        for (const collectionName of PRODUCT_COLLECTION_CANDIDATES) {
          const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/abrahamiish-cakes/databases/(default)/documents/${collectionName}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }
          );
          const json = await response.json();

          if (!response.ok) {
            throw new Error(json.error?.message || 'Unable to fetch products');
          }

          items = Array.isArray(json.documents)
            ? json.documents.map(normalizeRestProduct)
            : [];

          if (items.length) {
            break;
          }
        }

        if (!isActive) {
          return;
        }

        setProducts(items);
        setFetchError(items.length ? '' : reason || 'No products found in Firestore.');
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('REST fallback error:', error.message);
        setFetchError(error.message || reason || 'Unable to load products.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    let activeUnsubscribe = null;

    const subscribeToCollection = index => {
      const collectionName = PRODUCT_COLLECTION_CANDIDATES[index];

      activeUnsubscribe = onSnapshot(
        collection(db, collectionName),
        snapshot => {
          const items = snapshot.docs.map(normalizeProduct);

          if (!items.length && index + 1 < PRODUCT_COLLECTION_CANDIDATES.length) {
            if (activeUnsubscribe) {
              activeUnsubscribe();
            }
            subscribeToCollection(index + 1);
            return;
          }

          if (!items.length) {
            fetchProductsFromRest('Realtime listener returned no products.');
            return;
          }

          if (!isActive) {
            return;
          }

          setProducts(items);
          setFetchError('');
          setLoading(false);
        },
        error => {
          console.error('Products listener error:', error.message);
          fetchProductsFromRest(error.message);
        }
      );
    };

    subscribeToCollection(0);

    return () => {
      isActive = false;
      if (activeUnsubscribe) {
        activeUnsubscribe();
      }
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory =
        activeCategory === 'All' || product.category === activeCategory;
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <View style={styles.cardImage}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        ) : (
          <Text style={styles.cardEmoji}>🎂</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardCategory}>{item.category || 'Cake'}</Text>
          <Text style={[styles.stockTag, !item.inStock && styles.stockTagMuted]}>
            {item.inStock ? 'In stock' : 'Sold out'}
          </Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.subGreeting}>What cake do you crave today?</Text>
        </View>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => navigation.navigate('CartTab')}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cakes, pastries, and flavors"
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryBtn,
              activeCategory === category && styles.categoryBtnActive,
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cakes found</Text>
          <Text style={styles.emptyText}>
            {fetchError || 'Try a different category or search term.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: SCREEN_TOP_SPACE,
  },
  greeting: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  subGreeting: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  cartBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 10,
    position: 'relative',
    ...SHADOW,
  },
  cartIcon: { fontSize: 22 },
  badge: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
  },
  badgeText: { color: COLORS.surface, fontSize: 10, fontWeight: '700' },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 20,
    paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { color: COLORS.text, flex: 1, fontSize: 14, paddingVertical: 13 },
  categoriesContainer: { marginBottom: 16, maxHeight: 54 },
  categoriesContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  categoryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginRight: 10,
    minWidth: 88,
    paddingHorizontal: 16,
  },
  categoryBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: COLORS.surface },
  loader: { marginTop: 48 },
  productList: { paddingBottom: 20 },
  row: { justifyContent: 'space-between', paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    width: '48%',
    ...SHADOW,
  },
  cardImage: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    height: 120,
    justifyContent: 'center',
  },
  productImage: { height: '100%', width: '100%' },
  cardEmoji: { fontSize: 46 },
  cardBody: { padding: 12 },
  cardMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCategory: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stockTag: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '600',
  },
  stockTagMuted: { color: COLORS.textMuted },
  cardName: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardPrice: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
