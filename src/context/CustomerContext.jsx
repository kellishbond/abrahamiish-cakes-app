import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getOrderProgressLabel } from '../utils/orderStatus';
import { useAuth } from './AuthContext';

const CustomerContext = createContext();

const defaultPreferences = {
  favorites: [],
  savedAddresses: [],
  preferredPhone: '',
  preferredDeliverySlot: 'Morning',
  notificationsEnabled: false,
  pushToken: '',
};

export function CustomerProvider({ children }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setPreferences(defaultPreferences);
      setLoadingPreferences(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPreferences({
            favorites: Array.isArray(data.favorites) ? data.favorites : [],
            savedAddresses: Array.isArray(data.savedAddresses) ? data.savedAddresses : [],
            preferredPhone: data.preferredPhone || '',
            preferredDeliverySlot: data.preferredDeliverySlot || 'Morning',
            notificationsEnabled: Boolean(data.notificationsEnabled),
            pushToken: data.pushToken || '',
          });
        } else {
          setPreferences(defaultPreferences);
        }

        setLoadingPreferences(false);
      },
      () => {
        setPreferences(defaultPreferences);
        setLoadingPreferences(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !preferences.notificationsEnabled) {
      return undefined;
    }

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(ordersQuery, async snapshot => {
      const storedStatusesRaw = await AsyncStorage.getItem(`order-statuses-${user.uid}`);
      const storedStatuses = storedStatusesRaw ? JSON.parse(storedStatusesRaw) : {};
      const nextStatuses = {};

      for (const orderDoc of snapshot.docs) {
        const order = { id: orderDoc.id, ...orderDoc.data() };
        const currentStatus = order.status || 'Pending';
        nextStatuses[order.id] = currentStatus;

        if (storedStatuses[order.id] && storedStatuses[order.id] !== currentStatus) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Order update',
              body: `Order #${order.id.slice(0, 6)} is now ${getOrderProgressLabel(currentStatus)}.`,
            },
            trigger: null,
          });
        }
      }

      await AsyncStorage.setItem(
        `order-statuses-${user.uid}`,
        JSON.stringify(nextStatuses)
      );
    });

    return unsubscribe;
  }, [preferences.notificationsEnabled, user?.uid]);

  const mergePreferences = async patch => {
    if (!user?.uid) {
      return;
    }

    await setDoc(doc(db, 'users', user.uid), patch, { merge: true });
  };

  const toggleFavorite = async productId => {
    if (!user?.uid) {
      return;
    }

    const nextFavorites = preferences.favorites.includes(productId)
      ? preferences.favorites.filter(id => id !== productId)
      : [...preferences.favorites, productId];

    setPreferences(current => ({ ...current, favorites: nextFavorites }));
    await mergePreferences({ favorites: nextFavorites });
  };

  const saveAddress = async addressEntry => {
    if (!user?.uid || !addressEntry?.label || !addressEntry?.address) {
      return;
    }

    const deduped = preferences.savedAddresses.filter(
      item =>
        item.label !== addressEntry.label || item.address !== addressEntry.address
    );
    const nextAddresses = [addressEntry, ...deduped].slice(0, 5);

    setPreferences(current => ({ ...current, savedAddresses: nextAddresses }));
    await mergePreferences({ savedAddresses: nextAddresses });
  };

  const updateCustomerPreferences = async patch => {
    setPreferences(current => ({ ...current, ...patch }));
    await mergePreferences(patch);
  };

  const value = useMemo(
    () => ({
      ...preferences,
      loadingPreferences,
      isFavorite: productId => preferences.favorites.includes(productId),
      toggleFavorite,
      saveAddress,
      updateCustomerPreferences,
    }),
    [loadingPreferences, preferences]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  return useContext(CustomerContext);
}
