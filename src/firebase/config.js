import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC4OExHomp1QG3_rGzDeONxu-XsgPaOeYQ',
  authDomain: 'abrahamiish-cakes.firebaseapp.com',
  projectId: 'abrahamiish-cakes',
  storageBucket: 'abrahamiish-cakes.firebasestorage.app',
  messagingSenderId: '1044511336030',
  appId: '1:1044511336030:web:69a7829c5c33f25294b6cf',
};

const app = initializeApp(firebaseConfig);

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
export const storage = getStorage(app);

export default app;
