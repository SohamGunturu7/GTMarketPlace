import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ExplorePage.css';
import { useAuth } from '../contexts/AuthContext';

const tagIcons: Record<string, string> = {
  Textbooks: '📚',
  Electronics: '💻',
  Clothing: '👕',
  Housing: '🏠',
  Furniture: '🛋️',
  Tickets: '🎟️',
  Services: '🛠️',
  Appliances: '🔌',
  Other: '✨',
};

const sampleTags = [
  'Textbooks', 'Electronics', 'Clothing', 'Housing', 'Furniture', 'Tickets', 'Services', 'Appliances', 'Other'
];

// Add date formatting function
const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeFor, setShowTradeFor] = useState<{ [key: string]: boolean }>({});
  const tradeDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'listings'));
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Fetched listings:', listingsData); // Debug log
      setListings(listingsData);
      setLoading(false);
    };
    fetchListings();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      Object.keys(tradeDropdownRefs.current).forEach((id) => {
        const ref = tradeDropdownRefs.current[id];
        if (ref && !ref.contains(event.target as Node)) {
          setShowTradeFor((prev) => ({ ...prev, [id]: false }));
        }
      });
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleTradeClick = (listingId: string) => {
    setShowTradeFor(prev => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const handleMessageClick = async (listing: any) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const otherUserId = listing.userId;
    if (otherUserId === currentUser.uid) {
      alert('You cannot message yourself.');
      return;
    }
    // Fetch the other user's info
    let userInfo = { username: 'User', profilePicture: './gt.png' };
    try {
      const userSnap = await getDoc(doc(db, 'users', otherUserId));
      if (userSnap.exists()) {
        const data = userSnap.data();
        userInfo = {
          username: data.username || 'User',
          profilePicture: data.profilePicture || './default-avatar.png',
        };
      }
    } catch {}
    // Check if a chat already exists
    const chatId = [listing.id, currentUser.uid, otherUserId].sort().join('_');
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (chatSnap.exists()) {
      // Chat exists, open it
      navigate('/messages', {
        state: {
          listingId: listing.id,
          listingTitle: listing.title,
          recipientId: otherUserId,
          senderId: currentUser.uid,
          username: userInfo.username,
          profilePicture: userInfo.profilePicture,
        },
      });
    } else {
      // No chat, open a new one with user info
      navigate('/messages', {
        state: {
          listingId: listing.id,
          listingTitle: listing.title,
          recipientId: otherUserId,
          senderId: currentUser.uid,
          username: userInfo.username,
          profilePicture: userInfo.profilePicture,
        },
      });
    }
  };

  // Add this function to handle deleting a listing
  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'listings', listingId));
      setListings(prev => prev.filter(listing => listing.id !== listingId));
    } catch (err) {
      alert('Failed to delete listing. Please try again.');
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(search.toLowerCase()) ||
      listing.description.toLowerCase().includes(search.toLowerCase());
    const matchesTag =
      selectedTags.length === 0 ||
      (listing.tags && listing.tags.some((tag: string) => selectedTags.includes(tag)));
    const notSold = !listing.status || (typeof listing.status === 'string' && listing.status.toLowerCase() !== 'sold');
    return matchesSearch && matchesTag && notSold;
  });

  // Helper to handle broken images
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = './techtower.jpeg';
    e.currentTarget.alt = 'Tech Tower';
  };

  return (
    <div className="explore-page">
      <nav className="landing-nav glass-nav">
        <div className="landing-nav-left">
          <img src="./gt.png" alt="GT Logo" className="gt-logo" />
          <h1 className="landing-title">GT Marketplace</h1>
        </div>
        <div className="landing-nav-right">
          <button className="landing-nav-button" onClick={() => navigate('/')}>Home</button>
        </div>
      </nav>
      <aside className="filter-bar glass-filter">
        <h3>Filter by Tag</h3>
        <div className="tag-list">
          {sampleTags.map((tag) => (
            <button
              key={tag}
              className={`tag-btn${selectedTags.includes(tag) ? ' selected' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              <span className="tag-icon">{tagIcons[tag]}</span>
              <span className="tag-label">{tag}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className="explore-main">
        <div className="explore-search-bar">
          <span className="explore-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search for items, keywords, or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="explore-listings-grid">
          {loading ? (
            <div className="no-results">Loading...</div>
          ) : filteredListings.length === 0 ? (
            <div className="no-results">No listings found.</div>
          ) : (
            filteredListings.map((listing) => (
              <div className="explore-listing-card" key={listing.id}>
                <div className="explore-listing-image">
                  <img 
                    src={listing.image || './techtower.jpeg'} 
                    alt={listing.title} 
                    onError={handleImgError} 
                  />
                  <span className="explore-price-tag">${listing.price}</span>
                </div>
                <div className="explore-listing-details">
                  <h4>{listing.title}</h4>
                  <p className="explore-listing-desc">{listing.description}</p>
                  <div className="explore-tradefor-tags">
                    <button className="message-btn" onClick={() => handleTradeClick(listing.id)}>
                      Trade
                    </button>
                    <button className="message-btn" onClick={() => handleMessageClick(listing)}>Message</button>
                    {currentUser && listing.userId === currentUser.uid && (
                      <button
                        className="message-btn"
                        style={{ marginLeft: '10px' }}
                        onClick={() => handleDeleteListing(listing.id)}
                      >
                        Delete
                      </button>
                    )}
                    {showTradeFor[listing.id] && (
                      <div
                        className="trade-dropdown"
                        ref={el => (tradeDropdownRefs.current[listing.id] = el)}
                      >
                        <div className="trade-dropdown-title">Willing to Trade For:</div>
                        <div className="trade-dropdown-tags">
                          {listing.tradeFor && listing.tradeFor.split(',').map((item: string, idx: number) => (
                            <span className="explore-tradefor-tag" key={idx}>{item.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="explore-listing-meta">
                    <div className="explore-listing-info">
                      <span>{listing.location}</span>
                      <span className="explore-listing-date">{formatDate(listing.createdAt)}</span>
                    </div>
                    <div className="explore-tags">
                      {listing.tags && listing.tags.map((tag: string) => (
                        <span className="explore-tag" key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 