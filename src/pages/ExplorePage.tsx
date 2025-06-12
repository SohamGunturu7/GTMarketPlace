import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ExplorePage.css';
import { useAuth } from '../contexts/AuthContext';
import CampusMap from './CampusMap';
import PersistentNav from '../components/PersistentNav';

/* ——— icons & tags ——— */
const sampleTags = [
  'Textbooks', 'Electronics', 'Clothing', 'Housing', 'Furniture', 'Tickets', 'Services', 'Appliances', 'Other'
];

/* ——— util ——— */
const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ——— component ——— */
export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showMap, setShowMap] = useState(false);
  const [showTradeDropdown, setShowTradeDropdown] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);

  /* ——————————————————— fetch & normalise listings ——————————————————— */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, 'listings'));
      const cleaned = snap.docs.map(d => {
        const raw = d.data() as any;

        // robust lat/lng extraction
        const coerce = (v: any, a: string, b: string) => {
          if (typeof v === 'number') return v;
          if (typeof v === 'string') return parseFloat(v);
          if (v?.[a] !== undefined && v?.[b] !== undefined) return parseFloat(v[a]);
          return NaN;
        };
        const lat = coerce(raw.lat ?? raw.location, 'latitude', 'lat');
        const lng = coerce(raw.lng ?? raw.location, 'longitude', 'lng');

        return { id: d.id, ...raw, lat, lng };
      });
      setListings(cleaned);
      setLoading(false);
    })();
  }, []);

  /* ——————————————————— fetch user favorites ——————————————————— */
  useEffect(() => {
    if (currentUser) {
      (async () => {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFavorites(userData.favorites || []);
        }
      })();
    }
  }, [currentUser]);

  /* ——————————————————— toggle favorite ——————————————————— */
  const toggleFavorite = async (listingId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const isFavorited = favorites.includes(listingId);

    try {
      if (isFavorited) {
        await updateDoc(userRef, {
          favorites: arrayRemove(listingId)
        });
        setFavorites(prev => prev.filter(id => id !== listingId));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(listingId)
        });
        setFavorites(prev => [...prev, listingId]);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const toggleTradeDropdown = (listingId: string) => {
    setShowTradeDropdown(showTradeDropdown === listingId ? null : listingId);
  };

  /* ——————————————————— derived lists ——————————————————— */
  const filteredListings = listings.filter(l => {
    const matchesSearch =
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTag =
      selectedTags.length === 0 || l.tags?.some((t: string) => selectedTags.includes(t));
    const hasQuantity = typeof l.quantity === 'number' ? l.quantity > 0 : true;
    const notSoldOrHasQuantity = hasQuantity || (!l.status || (typeof l.status === 'string' && l.status.toLowerCase() !== 'sold'));
    const matchesFavorites = !showFavoritesOnly || favorites.includes(l.id);
    const notOwnListing = !currentUser || l.userId !== currentUser.uid;
    return matchesSearch && matchesTag && notSoldOrHasQuantity && matchesFavorites && notOwnListing;
  });
  const hasCoords = (l: any) => !isNaN(l.lat) && !isNaN(l.lng);

  /* ——————————————————— force map re‑layout when modal opens ——————————————————— */
  useEffect(() => {
    if (showMap) setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
  }, [showMap]);

  /* ——————————————————— JSX ——————————————————— */
  return (
    <div className="explore-page">
      <PersistentNav
        handleProfileClick={() => {}}
        handleEditProfile={() => {}}
        handleLogout={() => {}}
      />

      {/* TAG FILTER */}
      <aside className="filter-bar glass-filter">
        <h3>Filter by Tag</h3>
        <div className="tag-list">
          {currentUser && (
            <button
              className={`tag-btn${showFavoritesOnly ? ' selected' : ''}`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <span className="tag-icon">❤️</span>
              <span className="tag-label">Favorites</span>
            </button>
          )}
          {sampleTags.map(tag => (
            <button
              key={tag}
              className={`tag-btn${selectedTags.includes(tag) ? ' selected' : ''}`}
              onClick={() =>
                setSelectedTags(p => (p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]))
              }
            >
              <span className="tag-label">{tag}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="explore-main">
        {/* search + map */}
        <div className="explore-search-bar">
          <span className="explore-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search for items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="view-map-btn-dark" onClick={() => setShowMap(true)}>
            View Map
          </button>
        </div>

        {/* modal */}
        {showMap && (
          <div className="map-modal-overlay fullscreen" onClick={() => setShowMap(false)}>
            <div className="map-modal fullscreen" onClick={e => e.stopPropagation()}>
              <button className="close-map-btn" onClick={() => setShowMap(false)}>&times;</button>
              <CampusMap showMap={showMap} listings={filteredListings.filter(hasCoords)} />
            </div>
          </div>
        )}

        {/* listings grid */}
        <div className="explore-listings-grid">
          {loading ? (
            <div className="no-results">Loading...</div>
          ) : filteredListings.length === 0 ? (
            <div className="no-results">No listings found.</div>
          ) : (
            filteredListings.map(listing => (
              <div className="explore-listing-card" key={listing.id}>
                <div className="explore-listing-image">
                  <button 
                    className={`favorite-btn ${favorites.includes(listing.id) ? 'favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(listing.id);
                    }}
                    title={favorites.includes(listing.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.includes(listing.id) ? '❤️' : '🤍'}
                  </button>
                  <img
                    src={listing.image || './techtower.jpeg'}
                    alt={listing.title}
                    onError={e => {
                      e.currentTarget.src = './techtower.jpeg';
                      e.currentTarget.alt = 'Tech Tower';
                    }}
                  />
                  <span className="explore-price-tag">${listing.price}</span>
                  {listing.quantity && (
                    <span className="explore-quantity-tag">Qty: {listing.quantity}</span>
                  )}
                </div>

                <div className="explore-listing-details">
                  <div className="explore-listing-header-row">
                    <h4>{listing.title}</h4>
                    <div className="explore-listing-actions-top">
                      <button className="message-btn" onClick={() => {
                        if (!currentUser || !listing.userId || currentUser.uid === listing.userId) return;
                        navigate('/messages', {
                          state: {
                            listingId: listing.id,
                            recipientId: listing.userId,
                            senderId: currentUser.uid,
                            listingTitle: listing.title,
                          }
                        });
                      }}>
                        Message
                      </button>
                      <button className="message-btn" onClick={() => toggleTradeDropdown(listing.id)}>
                        Trade
                      </button>
                      {showTradeDropdown === listing.id && (
                        <div className="trade-dropdown">
                          <h4>Trades</h4>
                          <div className="trade-dropdown-tags">
                            {listing.tradeFor && listing.tradeFor.trim() ? (
                              listing.tradeFor.split(',').map((item: string, idx: number) => (
                                <span className="explore-tradefor-tag" key={idx}>{item.trim()}</span>
                              ))
                            ) : (
                              <span style={{ color: '#bfa14a', fontWeight: 600 }}>None</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="explore-listing-quantity">Quantity: {listing.quantity ?? 1}</div>
                  <p className="explore-listing-desc">{listing.description}</p>
                  <div className="explore-listing-bottom-row">
                    <div className="explore-listing-meta">
                      <span className="explore-listing-date">{formatDate(listing.createdAt)}</span>
                      <span>{listing.location}</span>
                      <div className="explore-tags">
                        {listing.tags?.map((tag: string) => (
                          <span className="explore-tag" key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    {currentUser?.uid === listing.userId && (
                      <button
                        className="message-btn explore-delete-btn"
                        onClick={() => {
                          setDeleteListingId(listing.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showDeleteModal && (
        <div className="sold-modal-overlay">
          <div className="sold-modal delete-modal">
            <h3>Delete Listing</h3>
            <p>Are you sure you want to delete this listing? This action cannot be undone.</p>
            <div className="sold-modal-actions">
              <button
                className="confirm-sold-btn"
                onClick={async () => {
                  if (!deleteListingId) return;
                  await deleteDoc(doc(db, 'listings', deleteListingId));
                  setListings(prev => prev.filter(l => l.id !== deleteListingId));
                  setShowDeleteModal(false);
                  setDeleteListingId(null);
                }}
              >
                Delete
              </button>
              <button
                className="cancel-sold-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteListingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
