import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { COLORS, DELIVERY_FEE, SCREEN_TOP_SPACE } from '../../constants/theme';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PAYMENT_METHODS = ['Pay on Delivery', 'Bank Transfer'];
const DELIVERY_SLOTS = ['Morning', 'Afternoon', 'Evening'];

export default function CheckoutScreen({ navigation }) {
  const { user, profile } = useAuth();
  const {
    preferredDeliverySlot,
    preferredPhone,
    savedAddresses,
    saveAddress,
    updateCustomerPreferences,
  } = useCustomer();
  const { cartItems, clearCart, total } = useCart();
  const [fullName, setFullName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(preferredPhone || '');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  });
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [deliverySlot, setDeliverySlot] = useState(preferredDeliverySlot || DELIVERY_SLOTS[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const grandTotal = useMemo(
    () => total + (cartItems.length ? DELIVERY_FEE : 0),
    [cartItems.length, total]
  );

  const handlePlaceOrder = async () => {
    if (!cartItems.length) {
      return Alert.alert('Cart is empty', 'Add products before checking out.');
    }

    if (!fullName || !phone || !address) {
      return Alert.alert('Missing details', 'Please complete your name, phone, and address.');
    }

    setSaving(true);
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        customerName: fullName,
        phone,
        address,
        deliveryDate: Timestamp.fromDate(deliveryDate),
        deliverySlot,
        paymentMethod,
        note: note.trim(),
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: Number(item.price || 0),
        })),
        subtotal: total,
        deliveryFee: DELIVERY_FEE,
        total: grandTotal,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      await saveAddress({
        label: fullName.split(' ')[0] || 'Saved address',
        address,
      });
      await updateCustomerPreferences({
        preferredPhone: phone,
        preferredDeliverySlot: deliverySlot,
      });

      clearCart();
      navigation.replace('OrderConfirmation', { orderId: orderRef.id });
    } catch (error) {
      Alert.alert(
        'Unable to place order',
        getFriendlyErrorMessage(
          error,
          'We could not place your order right now. Please try again in a moment.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.subtitle}>We just need a few delivery details.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery information</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#AAA"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#AAA"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Delivery Address"
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={3}
          value={address}
          onChangeText={setAddress}
        />

        {savedAddresses.length > 0 && (
          <View style={styles.savedAddressesWrap}>
            <Text style={styles.savedLabel}>Saved addresses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savedAddresses.map(item => (
                <TouchableOpacity
                  key={`${item.label}-${item.address}`}
                  style={styles.savedAddressChip}
                  onPress={() => setAddress(item.address)}
                >
                  <Text style={styles.savedAddressLabel}>{item.label}</Text>
                  <Text style={styles.savedAddressText} numberOfLines={2}>
                    {item.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker(true)}>
          <View>
            <Text style={styles.dateLabel}>Delivery date</Text>
            <Text style={styles.dateValue}>{formatDate(deliveryDate)}</Text>
          </View>
          <Text style={styles.dateAction}>Change</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={deliveryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (Platform.OS !== 'ios') {
                setShowPicker(false);
              }

              if (selectedDate) {
                setDeliveryDate(selectedDate);
              }
            }}
          />
        )}

        <Text style={styles.sectionTitle}>Delivery time slot</Text>
        <View style={styles.slotRow}>
          {DELIVERY_SLOTS.map(slot => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotBtn, deliverySlot === slot && styles.slotBtnActive]}
              onPress={() => setDeliverySlot(slot)}
            >
              <Text
                style={[styles.slotBtnText, deliverySlot === slot && styles.slotBtnTextActive]}
              >
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment method</Text>
        {PAYMENT_METHODS.map(method => (
          <TouchableOpacity
            key={method}
            style={styles.radioRow}
            onPress={() => setPaymentMethod(method)}
          >
            <View style={[styles.radioOuter, paymentMethod === method && styles.radioOuterActive]}>
              {paymentMethod === method && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{method}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Order note</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Optional note for cake message, landmarks, or delivery timing"
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={4}
          value={note}
          onChangeText={setNote}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order summary</Text>
        {cartItems.map(item => (
          <View key={`${item.id}-${item.size}`} style={styles.summaryRow}>
            <View style={styles.summaryMeta}>
              <Text style={styles.summaryName}>
                {item.name} x {item.quantity}
              </Text>
              <Text style={styles.summarySubText}>{item.size}</Text>
            </View>
            <Text style={styles.summaryAmount}>
              {formatCurrency(item.price * item.quantity)}
            </Text>
          </View>
        ))}

        <View style={styles.summaryTotals}>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(DELIVERY_FEE)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Delivery slot</Text>
            <Text style={styles.summaryAmount}>{deliverySlot}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalAmount}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.placeOrderBtn, saving && styles.placeOrderBtnDisabled]}
        disabled={saving}
        onPress={handlePlaceOrder}
      >
        <Text style={styles.placeOrderText}>
          {saving ? 'Placing order...' : 'Place Order'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40, paddingTop: SCREEN_TOP_SPACE },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, marginTop: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
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
  multilineInput: { minHeight: 88, textAlignVertical: 'top' },
  savedAddressesWrap: { marginBottom: 12 },
  savedLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  savedAddressChip: {
    backgroundColor: '#FFF1EE',
    borderRadius: 14,
    marginRight: 10,
    maxWidth: 210,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  savedAddressLabel: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  savedAddressText: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },
  dateField: {
    alignItems: 'center',
    backgroundColor: '#FFF7F5',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  dateValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  dateAction: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    backgroundColor: '#FFF7F5',
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotBtnActive: { backgroundColor: COLORS.card, borderColor: COLORS.primary },
  slotBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  slotBtnTextActive: { color: COLORS.primaryDark },
  radioRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  radioOuter: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    marginRight: 12,
    width: 22,
  },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  radioLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryMeta: { flex: 1, paddingRight: 14 },
  summaryName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  summarySubText: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  summaryAmount: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  summaryTotals: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 14,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: 14 },
  summaryTotalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  summaryTotalAmount: { color: COLORS.primary, fontSize: 17, fontWeight: '700' },
  placeOrderBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  placeOrderBtnDisabled: { opacity: 0.7 },
  placeOrderText: { color: COLORS.surface, fontSize: 15, fontWeight: '700' },
});
