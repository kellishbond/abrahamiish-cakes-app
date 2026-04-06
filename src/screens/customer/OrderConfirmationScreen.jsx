import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SCREEN_TOP_SPACE } from '../../constants/theme';

export default function OrderConfirmationScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Order placed successfully</Text>
      <Text style={styles.subtitle}>
        Your cake order is now pending confirmation.
      </Text>
      {orderId ? <Text style={styles.orderId}>Order ID: {orderId}</Text> : null}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.replace('CustomerTabs', { screen: 'HomeTab' })}
      >
        <Text style={styles.primaryBtnText}>Back to Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.replace('CustomerTabs', { screen: 'ProfileTab' })}
      >
        <Text style={styles.secondaryBtnText}>View My Orders</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 28,
    paddingTop: SCREEN_TOP_SPACE + 110,
  },
  emoji: { fontSize: 64, marginBottom: 18 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    textAlign: 'center',
  },
  orderId: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '700', marginBottom: 24 },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginBottom: 12,
    paddingVertical: 16,
    width: '100%',
  },
  primaryBtnText: { color: COLORS.surface, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    width: '100%',
  },
  secondaryBtnText: { color: COLORS.primaryDark, fontSize: 15, fontWeight: '700' },
});
