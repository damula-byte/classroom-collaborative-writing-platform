import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/config/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginTeacher = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerTeacher = async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const loginStudent = async () => {
    return signInAnonymously(auth);
  };

  const logout = async () => signOut(auth);

  return {
    user,
    loading,
    loginTeacher,
    registerTeacher,
    loginGoogle,
    loginStudent,
    logout,
    isTeacher: !!user && !user.isAnonymous,
    isStudent: !!user && user.isAnonymous,
  };
}
