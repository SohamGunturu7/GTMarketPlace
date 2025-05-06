import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, username: string, file?: File) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, username: string, file?: File) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    let profilePictureUrl = '';
    if (file) {
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      profilePictureUrl = await getDownloadURL(storageRef);
      await updateProfile(user, { displayName: username, photoURL: profilePictureUrl });
    } else {
      await updateProfile(user, { displayName: username });
    }
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
    });
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let profilePictureUrl = user.photoURL || '/default-avatar.png';

    // If Google provides a photoURL, download and upload to Firebase Storage
    if (user.photoURL && (!userSnap.exists() || !userSnap.data().profilePicture || userSnap.data().profilePicture === user.photoURL)) {
      try {
        const response = await fetch(user.photoURL);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(storageRef, blob);
        profilePictureUrl = await getDownloadURL(storageRef);
        // Update Auth profile as well
        await updateProfile(user, { photoURL: profilePictureUrl });
      } catch (err) {
        profilePictureUrl = '/default-avatar.png';
      }
    } else if (userSnap.exists() && userSnap.data().profilePicture) {
      profilePictureUrl = userSnap.data().profilePicture;
    }

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        username: user.displayName || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profilePicture: profilePictureUrl,
      });
    } else {
      await setDoc(userRef, {
        lastLogin: new Date().toISOString(),
        profilePicture: profilePictureUrl,
      }, { merge: true });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString(),
          }, { merge: true });
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 