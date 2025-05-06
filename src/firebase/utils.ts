import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

export async function createUserDocument(user: User, username: string) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: user.email,
      username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profilePicture: '/default-avatar.png',
    });
  }
}

export async function updateUserLastLogin(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    await setDoc(userRef, {
      lastLogin: new Date().toISOString(),
    }, { merge: true });
  }
} 