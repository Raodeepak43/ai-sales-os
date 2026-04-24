"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. First, check if we just returned from a redirect
        const result = await getRedirectResult(auth);
        if (result?.user && mounted) {
          setUser(result.user);
        }
      } catch (err) {
        console.error("Auth Redirect Error:", err);
      }

      // 2. Then, listen for subsequent state changes
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!mounted) return;

        if (currentUser) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: new Date(),
                businessName: "",
                handle: currentUser.uid.substring(0, 8),
                aiTone: "professional",
              });
            }
          } catch (error) {
            console.error("Firestore Profile Error:", error);
          }
        }
        
        setUser(currentUser);
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribePromise = initAuth();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Use redirect for mobile/social apps to avoid popup blocks
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSocialApp = /FBAN|FBAV|Instagram|Twitter|Threads/i.test(navigator.userAgent);

      if (isMobile || isSocialApp) {
        return await signInWithRedirect(auth, provider);
      } else {
        // For desktop, popup is better but can be blocked
        try {
          return await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
            return await signInWithRedirect(auth, provider);
          }
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
