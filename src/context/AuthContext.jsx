import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        setProfile({
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
        });

        unsubscribeProfile = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          snapshot => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setRole(data.role || 'customer');
              setProfile({
                name: data.name || firebaseUser.displayName || '',
                email: data.email || firebaseUser.email || '',
              });
            } else {
              setRole('customer');
              setProfile({
                name: firebaseUser.displayName || '',
                email: firebaseUser.email || '',
              });
            }
            setLoading(false);
          },
          error => {
            console.error('Profile listener error:', error.message);
            setRole('customer');
            setProfile({
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
            });
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signup = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await setDoc(doc(db, 'users', result.user.uid), {
      name,
      email,
      role: 'customer',
      createdAt: serverTimestamp(),
    });
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
