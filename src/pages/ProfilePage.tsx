import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { auth, storage } from '../firebase/config';
import './ProfilePage.css';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const DEFAULT_PROFILE_PICTURE_PATH = 'profile-pictures/techtower.jpeg';

function useDefaultProfilePicture() {
  const [defaultUrl, setDefaultUrl] = useState<string | null>(null);

  useEffect(() => {
    const storage = getStorage();
    const imageRef = ref(storage, DEFAULT_PROFILE_PICTURE_PATH);
    getDownloadURL(imageRef)
      .then((url) => setDefaultUrl(url))
      .catch((error) => {
        console.error("Error getting default profile picture URL:", error);
        setDefaultUrl(null);
      });
  }, []);

  return defaultUrl;
}

function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [wantedItems, setWantedItems] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [newWantedItem, setNewWantedItem] = useState('');

  const defaultProfilePicture = useDefaultProfilePicture();

  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) {
        navigate('/');
        return;
      }
      setEmail(currentUser.email || '');
      // Fetch from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || currentUser.displayName || '');
        setProfilePicture(data.profilePicture || currentUser.photoURL || null);
        setInterests(data.interests || []);
        setWantedItems(data.wantedItems || []);
      } else {
        setUsername(currentUser.displayName || '');
        setProfilePicture(currentUser.photoURL || null);
      }
    }
    fetchUserData();
  }, [currentUser, navigate]);

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsLoading(true);
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(currentUser, { photoURL: downloadURL });
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePicture: downloadURL });
      setProfilePicture(downloadURL);
      setMessage('Profile picture updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update profile picture. Please try again.');
      setTimeout(() => setError(''), 3000);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsLoading(true);
      await updateProfile(currentUser, { displayName: username });
      setMessage('Username updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update username. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsLoading(true);
      await updateEmail(currentUser, email);
      setMessage('Email updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update email. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update password. Please check your current password.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };

  const handleAddWantedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWantedItem.trim() && !wantedItems.includes(newWantedItem.trim())) {
      setWantedItems([...wantedItems, newWantedItem.trim()]);
      setNewWantedItem('');
    }
  };

  const handleRemoveWantedItem = (itemToRemove: string) => {
    setWantedItems(wantedItems.filter(item => item !== itemToRemove));
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsLoading(true);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        interests,
        wantedItems
      });
      setMessage('Preferences updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update preferences. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile Settings</h1>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Profile Picture</h2>
          <div className="profile-picture-container">
            <img
              src={profilePicture || defaultProfilePicture || '/fallback-local.png'}
              alt="Profile"
              className="profile-picture"
            />
            <button
              className="change-picture-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Change Picture
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="profile-section">
          <h2>Username</h2>
          <form onSubmit={handleUsernameChange}>
            <div className="form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
          </form>
        </div>

        <div className="profile-section">
          <h2>Email</h2>
          <form onSubmit={handleEmailChange}>
            <div className="form-group">
              <input
                type="email"
                value={email}
                disabled
                placeholder="Enter your email"
                required
              />
            </div>
          </form>
        </div>

        <div className="profile-section">
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button type="submit" className="save-button" disabled={isLoading}>
              Update Password
            </button>
          </form>
        </div>

        <div className="profile-section">
          <h2>Interests & Preferences</h2>
          <form onSubmit={handleSavePreferences}>
            <div className="form-group">
              <label>Interests (Tags)</label>
              <div className="tags-container">
                {interests.map((interest, index) => (
                  <div key={index} className="tag">
                    {interest}
                    <button
                      type="button"
                      className="remove-tag"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddInterest} className="add-tag-form">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest"
                />
                <button type="submit" className="add-tag-button">Add</button>
              </form>
            </div>

            <div className="form-group">
              <label>Items I'm Looking For</label>
              <div className="tags-container">
                {wantedItems.map((item, index) => (
                  <div key={index} className="tag">
                    {item}
                    <button
                      type="button"
                      className="remove-tag"
                      onClick={() => handleRemoveWantedItem(item)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddWantedItem} className="add-tag-form">
                <input
                  type="text"
                  value={newWantedItem}
                  onChange={(e) => setNewWantedItem(e.target.value)}
                  placeholder="Add an item you're looking for"
                />
                <button type="submit" className="add-tag-button">Add</button>
              </form>
            </div>

            <button type="submit" className="save-button" disabled={isLoading}>
              Save Preferences
            </button>
          </form>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
      </div>
    </div>
  );
}

export default ProfilePage; 