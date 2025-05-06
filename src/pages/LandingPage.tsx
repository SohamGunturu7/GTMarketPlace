import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import './LandingPage.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { storage, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function LandingPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifCount, setNotifCount] = useState(0);

  // Listen for unread messages
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'chats'), where('users', 'array-contains', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach((doc) => {
        const messages = doc.data().messages || [];
        messages.forEach((msg: any) => {
          if (msg.from !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)) {
            count++;
          }
        });
      });
      setNotifCount(count);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    } else {
      // Set initial values
      setEmail(currentUser.email || '');
      // You would typically fetch the username from your database here
      setUsername(currentUser.displayName || 'User');
      setProfilePicture(currentUser.photoURL || './default-avatar.png');
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleEditProfile = () => {
    setShowDropdown(false);
    setShowEditProfile(true);
  };

  const handleMyListings = () => {
    setShowDropdown(false);
    navigate('/my-listings');
  };

  const handlePurchaseHistory = () => {
    setShowDropdown(false);
    navigate('/purchase-history');
  };

  const handleMessages = () => {
    setShowDropdown(false);
    navigate('/messages');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setIsLoading(true);
      await updateProfile(currentUser, { displayName: username });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowEditProfile(false);
    } catch (error) {
      setError('Failed to update profile. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setIsLoading(true);
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(currentUser, { photoURL: downloadURL });
      setProfilePicture(downloadURL);
      setSuccess('Profile picture updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update profile picture.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <nav className="landing-nav glass-nav">
        <div className="landing-nav-left">
          <img src="./gt.png" alt="GT Logo" className="gt-logo" />
          <h1 className="landing-title">GT Marketplace</h1>
        </div>
        <div className="landing-nav-right">
          <div className="user-section" onClick={handleProfileClick} style={{ position: 'relative' }}>
            <img src={profilePicture || './default-avatar.png'} alt="Profile" className="profile-pic" />
            <span className="username">{username}</span>
            {notifCount > 0 && (
              <span className="notif-badge">{notifCount}</span>
            )}
            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={handleEditProfile}>Edit Profile</button>
                <button onClick={handleMyListings}>My Listings</button>
                <button onClick={handlePurchaseHistory}>Purchase History</button>
                <button onClick={handleMessages}>Messages</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {showEditProfile && (
        <div className="edit-profile-modal">
          <div className="edit-profile-content">
            <h2>Edit Profile</h2>
            <div className="edit-profile-picture-container">
              <img
                src={profilePicture || './default-avatar.png'}
                alt="Profile"
                className="edit-profile-picture"
              />
              <button
                type="button"
                className="change-picture-button"
                tabIndex={0}
                onClick={() => {
                  console.log('Change Picture button clicked');
                  fileInputRef.current?.click();
                }}
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
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              {success && <p className="success-message">{success}</p>}
              <div className="button-group">
                <button type="submit" className="save-button" disabled={isLoading}>Save Changes</button>
                <button type="button" className="cancel-button" onClick={() => setShowEditProfile(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animated Hero Section */}
      <section className="hero-section awesome-hero-bg">
        <div className="hero-content">
          <h2 className="hero-headline">Welcome to <span className="highlight">GT Marketplace</span></h2>
          <p className="hero-tagline">The ultimate campus marketplace for Yellow Jackets. Buy, sell, and connect with your Georgia Tech community!</p>
          <div className="hero-buttons">
            <button className="cta-button" onClick={() => navigate('/explore')}>Start Exploring</button>
            <button className="new-listing-button" onClick={() => navigate('/new-listing')}>New Listing</button>
          </div>
        </div>
        {/* SVG Wave or animated background can go here */}
        <svg className="hero-wave" viewBox="0 0 1440 320"><path fill="#B3A369" fillOpacity="1" d="M0,224L48,197.3C96,171,192,117,288,117.3C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,128C1248,139,1344,213,1392,250.7L1440,288L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
      </section>

      <div className="categories-section">
        <h3>Popular Categories</h3>
        <div className="categories-grid">
          <div className="category-card">
            <i className="category-icon">📚</i>
            <h4>Textbooks</h4>
            <p>Find your course materials</p>
          </div>
          <div className="category-card">
            <i className="category-icon">💻</i>
            <h4>Electronics</h4>
            <p>Tech and gadgets</p>
          </div>
          <div className="category-card">
            <i className="category-icon">👕</i>
            <h4>Clothing</h4>
            <p>GT apparel and more</p>
          </div>
          <div className="category-card">
            <i className="category-icon">🏠</i>
            <h4>Housing</h4>
            <p>Find your next home</p>
          </div>
        </div>
      </div>

      <div className="how-we-work-section">
        <h3>How We Work</h3>
        <div className="how-we-work-grid">
          <div className="how-we-work-card">
            <i className="how-we-work-icon">🔍</i>
            <h4>Browse & Search</h4>
            <p>Explore listings by keyword, tag, or location. Find exactly what you need on campus.</p>
          </div>
          <div className="how-we-work-card">
            <i className="how-we-work-icon">➕</i>
            <h4>Create & Manage Listings</h4>
            <p>Post your own items, edit details, and mark as sold when you make a deal.</p>
          </div>
          <div className="how-we-work-card">
            <i className="how-we-work-icon">💬</i>
            <h4>Real-Time Chat</h4>
            <p>Message other students instantly and securely to negotiate and arrange meetups.</p>
          </div>
          <div className="how-we-work-card">
            <i className="how-we-work-icon">🔄</i>
            <h4>Trades</h4>
            <p>See what items people want to trade for, and DM them directly to negotiate a swap or deal.</p>
          </div>
          <div className="how-we-work-card">
            <i className="how-we-work-icon">🛒</i>
            <h4>Purchase History</h4>
            <p>See everything you've bought in one place, with details and seller info.</p>
          </div>
          <div className="how-we-work-card">
            <i className="how-we-work-icon">🎓</i>
            <h4>GT-Only Community</h4>
            <p>Buy, sell, and trade with confidence—only Georgia Tech students can join.</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>About</h4>
            <a href="#">Our Story</a>
            <a href="#">Safety Tips</a>
            <a href="#">Terms of Service</a>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Report an Issue</a>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#"><i>📱</i></a>
              <a href="#"><i>📘</i></a>
              <a href="#"><i>📸</i></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 GT Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage; 