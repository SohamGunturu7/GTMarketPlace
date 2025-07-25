import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import './LandingPage.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { storage, db } from '../firebase/config';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import RecentActivityFeed from './RecentActivityFeed';
import PersistentNav from '../components/PersistentNav';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  setUser, setNotifCount, setWantedItems, setInterests, setShowDropdown, setDropdownClosing,
  setShowEditProfile, setError, setSuccess, logoutUser
} from '../features/userSlice';

const sampleTags = [
  'Textbooks', 'Electronics', 'Clothing', 'Housing', 'Furniture', 'Tickets', 'Services', 'Appliances', 'Other'
];

// Helper for dynamic tilt effect
function useCardTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 7;
    const rotateY = ((x - centerX) / centerX) * -7;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.035)`;
  };
  const handleMouseLeave = () => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = '';
  };
  return { ref, handleMouseMove, handleMouseLeave };
}

const features = [
  { icon: '🔍', title: 'Browse & Search', desc: 'Explore listings by keyword, tag, or location. Find exactly what you need on campus.' },
  { icon: '➕', title: 'Create & Manage Listings', desc: 'Post your own items, edit details, and mark as sold when you make a deal.' },
  { icon: '💬', title: 'Real-Time Chat', desc: 'Message other students instantly and securely to negotiate and arrange meetups.' },
  { icon: '🔄', title: 'Trades', desc: 'See what items people want to trade for, and DM them directly to negotiate a swap or deal.' },
  { icon: '🛒', title: 'Purchase History', desc: 'See everything you\'ve bought in one place, with details and seller info.' },
  { icon: '🎓', title: 'Recommended For You', desc: 'Get personalized recommendations based on your interests and preferences.' },
];

function LandingPage() {
  const { currentUser: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    username, email, profilePicture,
    wantedItems, interests,
    showDropdown, showEditProfile, error, success
  } = useSelector((state: RootState) => state.user);

  // Local state for non-user-specific UI
  const [isLoading, setIsLoading] = useState(false);
  const [newWantedItem, setNewWantedItem] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dashboardStats, setDashboardStats] = useState({ sold: 0, active: 0, bought: 0, loading: true });
  const [recommendedListings, setRecommendedListings] = useState<any[]>([]);
  const [profileSnapshot, setProfileSnapshot] = useState<any>(null);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Listen for unread messages
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, 'chats'), where('users', 'array-contains', authUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach((doc) => {
        const messages = doc.data().messages || [];
        messages.forEach((msg: any) => {
          if (msg.from !== authUser.uid && !msg.readBy?.includes(authUser.uid)) {
            count++;
          }
        });
      });
      dispatch(setNotifCount(count));
    });
    return () => unsubscribe();
  }, [authUser, dispatch]);

  // Set user info in Redux (serializable only)
  useEffect(() => {
    if (authUser) {
      dispatch(setUser({
        uid: authUser.uid,
        email: authUser.email || '',
        username: authUser.displayName || 'User',
        profilePicture: authUser.photoURL || './default-avatar.png',
      }));
      // Fetch user preferences
      const fetchUserPreferences = async () => {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          dispatch(setInterests(data.interests || []));
          dispatch(setWantedItems(data.wantedItems || []));
        }
      };
      fetchUserPreferences();
    } else {
      dispatch(setUser({
        uid: null,
        email: '',
        username: '',
        profilePicture: null,
      }));
    }
  }, [authUser, dispatch]);

  // Dashboard stats
  useEffect(() => {
    async function fetchDashboardStats() {
      if (!authUser) return;
      setDashboardStats({ sold: 0, active: 0, bought: 0, loading: true });
      const q = query(collection(db, 'listings'), where('userId', '==', authUser.uid));
      const querySnapshot = await getDocs(q);
      let sold = 0, active = 0;
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (typeof data.status === 'string' && data.status.toLowerCase() === 'sold') sold++;
        else active++;
      });
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      let bought = 0;
      if (userDoc.exists()) {
        const data = userDoc.data();
        bought = Array.isArray(data.purchaseHistory) ? data.purchaseHistory.length : 0;
      }
      setDashboardStats({ sold, active, bought, loading: false });
    }
    if (authUser) fetchDashboardStats();
  }, [authUser, dispatch]);

  // Fetch and score listings for recommendations
  useEffect(() => {
    async function fetchAndScoreListings() {
      if (!authUser || (interests.length === 0 && wantedItems.length === 0)) {
        setRecommendedListings([]);
        return;
      }
      const q = query(collection(db, 'listings'), where('status', 'in', ['Active', '', null]));
      const querySnapshot = await getDocs(q);
      const allListings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const scored = allListings
        .filter((listing: any) => {
          if (typeof listing.status === 'string' && listing.status.toLowerCase() === 'sold') return false;
          if (listing.userId && authUser && listing.userId === authUser.uid) return false;
          return true;
        })
        .map((listing: any) => {
          let score = 0;
          if (listing.tags && Array.isArray(listing.tags)) {
            score += listing.tags.filter((tag: string) => interests.includes(tag)).length;
          }
          const text = ((listing.title || '') + ' ' + (listing.description || '')).toLowerCase();
          wantedItems.forEach(item => {
            if (text.includes(item.toLowerCase())) score += 2;
          });
          return { ...listing, _score: score };
        });
      const top = scored.filter(l => l._score > 0).sort((a, b) => b._score - a._score).slice(0, 6);
      setRecommendedListings(top);
    }
    fetchAndScoreListings();
  }, [authUser, interests, wantedItems]);

  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0 && !hasAnimated) {
          setGridVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: [0] }
    );
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  // Handlers
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutPopup(true);
      setTimeout(() => setShowLogoutPopup(false), 2000);
      dispatch(logoutUser());
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleProfileClick = () => {
    if (showDropdown) {
      dispatch(setDropdownClosing(true));
      setTimeout(() => {
        dispatch(setShowDropdown(false));
        dispatch(setDropdownClosing(false));
      }, 320);
    } else {
      dispatch(setShowDropdown(true));
    }
  };

  const handleEditProfile = () => {
    dispatch(setShowDropdown(false));
    setProfileSnapshot({
      username,
      email,
      profilePicture,
      interests: [...interests],
      wantedItems: [...wantedItems],
    });
    dispatch(setShowEditProfile(true));
  };

  const handleCancelEditProfile = () => {
    if (profileSnapshot) {
      // Restore all user data from snapshot
      dispatch(setUser({
        username: profileSnapshot.username,
        email: profileSnapshot.email,
        profilePicture: profileSnapshot.profilePicture,
      }));
      dispatch(setInterests([...profileSnapshot.interests]));
      dispatch(setWantedItems([...profileSnapshot.wantedItems]));
      // Clear the snapshot
      setProfileSnapshot(null);
    }
    dispatch(setShowEditProfile(false));
  };

  const handleAddWantedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWantedItem.trim() || wantedItems.includes(newWantedItem.trim()) || !authUser) return;
    const updated = [...wantedItems, newWantedItem.trim()];
    dispatch(setWantedItems(updated));
    setNewWantedItem('');
    try {
      await updateDoc(doc(db, 'users', authUser.uid), { wantedItems: updated });
      dispatch(setSuccess('Item added!'));
      setTimeout(() => dispatch(setSuccess('')), 1500);
    } catch (err) {
      dispatch(setError('Failed to add item.'));
      setTimeout(() => dispatch(setError('')), 2000);
    }
  };

  const handleRemoveWantedItem = async (itemToRemove: string) => {
    if (!authUser) return;
    const updated = wantedItems.filter(item => item !== itemToRemove);
    dispatch(setWantedItems(updated));
    try {
      await updateDoc(doc(db, 'users', authUser.uid), { wantedItems: updated });
      dispatch(setSuccess('Item removed!'));
      setTimeout(() => dispatch(setSuccess('')), 1500);
    } catch (err) {
      dispatch(setError('Failed to remove item.'));
      setTimeout(() => dispatch(setError('')), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    try {
      setIsLoading(true);
      // Update Firebase profile
      await updateProfile(authUser, { displayName: username });
      // Update Firestore document with all user data
      await updateDoc(doc(db, 'users', authUser.uid), {
        username,
        interests,
        wantedItems,
        profilePicture
      });
      // Update Redux store with all user data
      dispatch(setUser({
        username,
        email,
        profilePicture,
      }));
      dispatch(setInterests([...interests]));
      dispatch(setWantedItems([...wantedItems]));
      // Clear the snapshot since changes are saved
      setProfileSnapshot(null);
      dispatch(setShowEditProfile(false));
      dispatch(setSuccess('Profile updated successfully!'));
      setTimeout(() => dispatch(setSuccess('')), 3000);
    } catch (error) {
      dispatch(setError('Failed to update profile. Please try again.'));
      setTimeout(() => dispatch(setError('')), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    try {
      setIsLoading(true);
      const storageRef = ref(storage, `profile-pictures/${authUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(authUser, { photoURL: downloadURL });
      dispatch(setUser({ profilePicture: downloadURL }));
      dispatch(setSuccess('Profile picture updated!'));
      setTimeout(() => dispatch(setSuccess('')), 3000);
    } catch (err) {
      dispatch(setError('Failed to update profile picture.'));
      setTimeout(() => dispatch(setError('')), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = './techtower.jpeg';
    e.currentTarget.alt = 'Tech Tower';
  };

  const handleToggleInterest = (tag: string) => {
    const newInterests = interests.includes(tag)
      ? interests.filter((t) => t !== tag)
      : [...interests, tag];
    dispatch(setInterests(newInterests));
  };

  return (
    <div className="landing-container">
      {showLogoutPopup && (
        <div className="logout-popup">Logged Out</div>
      )}
      {showLoginPrompt && (
        <div className="login-prompt-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="login-prompt-modal" onClick={e => e.stopPropagation()}>
            <button className="login-prompt-close" onClick={() => setShowLoginPrompt(false)} aria-label="Close">&times;</button>
            <span className="login-prompt-title">Log in required</span>
            <p className="login-prompt-message">You must log in before using this feature.</p>
            <button className="login-prompt-login-btn" onClick={() => navigate('/login')}>Log In</button>
          </div>
        </div>
      )}
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      <PersistentNav
        handleProfileClick={handleProfileClick}
        handleEditProfile={handleEditProfile}
        handleLogout={handleLogout}
      />
      
      {showEditProfile && (
        <div className="edit-profile-modal">
          <div className="edit-profile-content" style={{ position: 'relative' }}>
            <button
              className="edit-profile-close-btn"
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, background: 'none', border: 'none', fontSize: '2rem', color: '#003057', cursor: 'pointer' }}
              aria-label="Close"
              onClick={handleCancelEditProfile}
            >
              &times;
            </button>
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
                  onChange={(e) => dispatch(setUser({ username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  required
                />
              </div>
              <div className="form-group">
                <label>Interests (Tags)</label>
                <div className="tag-list">
                  {sampleTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn${interests.includes(tag) ? ' selected' : ''}`}
                      onClick={() => handleToggleInterest(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
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
                <div className="add-tag-form">
                  <input
                    type="text"
                    value={newWantedItem}
                    onChange={(e) => setNewWantedItem(e.target.value)}
                    placeholder="Add an item you're looking for"
                    onKeyDown={e => { if (e.key === 'Enter') { handleAddWantedItem(e); } }}
                  />
                  <button type="button" className="add-tag-button" onClick={handleAddWantedItem}>Add</button>
                </div>
              </div>
              {error && <p className="error-message">{error}</p>}
              {success && <p className="success-message">{success}</p>}
              <div className="button-group">
                <button type="submit" className="save-button" disabled={isLoading}>Save Changes</button>
                <button type="button" className="cancel-button" onClick={handleCancelEditProfile}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="awesome-hero-bg">
        <div className="hero-content">
          <h2 className="hero-headline">
            <span className="welcome-text">Welcome to</span>
            <span className="highlight">GT Marketplace</span>
          </h2>
          <p className="hero-tagline">The ultimate campus marketplace for Yellow Jackets. Buy, sell, and connect with your Georgia Tech community!</p>
          <div className="hero-buttons">
            <button className="cta-button" onClick={() => {
              if (authUser) {
                navigate('/explore');
              } else {
                setShowLoginPrompt(true);
              }
            }}>Start Exploring</button>
            <button className="new-listing-button" onClick={() => {
              if (authUser) {
                navigate('/new-listing');
              } else {
                setShowLoginPrompt(true);
              }
            }}>New Listing</button>
          </div>
        </div>
        <svg className="hero-wave" viewBox="0 0 1440 320">
          <path fill="#ffffff" fillOpacity="0.1" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </section>

      <div className="how-we-work-bg">
        <section className="how-we-work-section">
          <h3>Features and Benefits</h3>
          <div className="how-we-work-grid" ref={gridRef}>
            {features.map((f, i) => {
              const { ref, handleMouseMove, handleMouseLeave } = useCardTilt();
              const setRefs = (el: HTMLDivElement | null) => {
                (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
              };
              return (
                <div
                  key={f.title}
                  ref={setRefs}
                  className={`how-we-work-card dynamic-feature-card${gridVisible ? ' visible' : ''}`}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <i className="how-we-work-icon">{f.icon}</i>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {authUser && (
        <div
          className="dashboard-activity-container"
          style={{
            display: 'flex',
            flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
            gap: window.innerWidth <= 600 ? '2.2rem' : '2.5rem',
            justifyContent: 'center',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto 4rem auto',
            height: window.innerWidth <= 600 ? 'auto' : '520px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, maxWidth: 520, height: '100%' }}>
              <RecentActivityFeed />
          </div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 520, height: '100%' }}>
            <section className="dashboard-section" style={{ background: '#fffbe6', borderRadius: '1.5rem', boxShadow: '0 8px 32px rgba(179,163,105,0.10)', padding: '2.8rem 2.5rem 2.2rem 2.5rem', margin: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
              <h3 className="dashboard-title" style={{ color: '#003057', fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.7rem', letterSpacing: '-1px', marginTop: 0, textAlign: 'left', position: 'relative' }}>
                  Dashboard
                </h3>
              <div className="dashboard-inner-box" style={{ background: '#fffbe6', borderRadius: '1.2rem', boxShadow: '0 4px 24px rgba(179,163,105,0.13)', padding: '2.2rem 1.2rem', marginTop: 0, marginBottom: 0, width: '100%', boxSizing: 'border-box', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                {/* 2-on-1 row, 1-on-next-row infographic layout */}
                <div style={{ width: '100%', margin: '0 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', gap: '1.5rem', width: '100%' }}>
                    {/* Sold Stat */}
                    <div style={{ flex: 1, minWidth: 0, maxWidth: 170, height: 120, background: 'linear-gradient(135deg, #bfa14a 80%, #e6c97a 100%)', borderRadius: '1.2rem', boxShadow: '0 4px 24px rgba(179,163,105,0.13)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{dashboardStats.sold}</span>
                      <span style={{ fontSize: 18, color: '#fff', fontWeight: 700, marginTop: 2 }}>Sold</span>
                    </div>
                    {/* Active Listings Stat */}
                    <div style={{ flex: 1, minWidth: 0, maxWidth: 170, height: 120, background: 'linear-gradient(135deg, #232a34 80%, #181c23 100%)', borderRadius: '1.2rem', boxShadow: '0 4px 24px rgba(24,28,35,0.13)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: '#fffbe6', marginBottom: 6 }}>{dashboardStats.active}</span>
                      <span style={{ fontSize: 18, color: '#fffbe6', fontWeight: 700, marginTop: 2, textAlign: 'center' }}>Listings</span>
                    </div>
                  </div>
                  {/* Bought Stat on next row, centered */}
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: '0 1 170px', minWidth: 0, maxWidth: 170, height: 120, background: 'linear-gradient(135deg, #fff 80%, #f8f9fa 100%)', borderRadius: '1.2rem', boxShadow: '0 4px 24px rgba(191,161,74,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: '#232a34', marginBottom: 6 }}>{dashboardStats.bought}</span>
                      <span style={{ fontSize: 18, color: '#232a34', fontWeight: 700, marginTop: 2 }}>Bought</span>
                    </div>
                    </div>
                  </div>
                </div>
              </section>
          </div>
        </div>
      )}

      {/* Recommended Listings Section */}
      {recommendedListings.length > 0 && (
        <section className="recommended-section">
          <div className="recommended-box">
            <h3 className="recommended-title">Recommended For You</h3>
            <div className="recommended-grid">
              {recommendedListings.map(listing => {
                const imageUrl = listing.image && typeof listing.image === 'string' && listing.image.trim() !== '' ? listing.image : './techtower.jpeg';
                return (
                  <div className="recommended-card" key={listing.id}>
                    <div className="recommended-image">
                      <img src={imageUrl} alt={listing.title} onError={handleImgError} />
                    </div>
                    <div className="recommended-details">
                      <h4>{listing.title}</h4>
                      <div className="recommended-price">${listing.price}</div>
                      <div className="recommended-tags">
                        {listing.tags && listing.tags.map((tag: string) => (
                          <span className="recommended-tag" key={tag}>{tag}</span>
                        ))}
                      </div>
                      <button className="recommended-view-btn" onClick={() => navigate(`/explore?listing=${listing.id}`)}>View</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>About</h4>
            <Link to="/about" className="footer-link">Our Story</Link>
            <Link to="/about" className="footer-link">Safety Tips</Link>
            <Link to="/about" className="footer-link">Terms of Service</Link>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <Link to="/support" className="footer-link">FAQ</Link>
            <Link to="/support" className="footer-link">Contact Us</Link>
            <Link to="/support" className="footer-link">Report an Issue</Link>
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