import './MyListingsPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function MyListingsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerUsername, setBuyerUsername] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const fetchListings = async () => {
      setLoading(true);
      const q = query(collection(db, 'listings'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      setMyListings(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchListings();
  }, [currentUser]);

  const handleMarkAsSold = (listing: any) => {
    setSelectedListing(listing);
    setShowSoldModal(true);
    setBuyerEmail('');
    setBuyerUsername('');
    setModalError('');
  };

  const handleSoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail || !buyerUsername || !selectedListing) {
      setModalError('Please enter both email and username.');
      return;
    }
    // Find the buyer's user document
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', buyerEmail), where('username', '==', buyerUsername));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      setModalError('No user found with that email and username.');
      return;
    }
    const buyerDoc = querySnapshot.docs[0];
    // Update the listing status
    await updateDoc(doc(db, 'listings', selectedListing.id), { status: 'sold', updatedAt: serverTimestamp() });
    // Add to buyer's purchaseHistory
    await updateDoc(doc(db, 'users', buyerDoc.id), {
      purchaseHistory: arrayUnion({
        listingId: selectedListing.id,
        title: selectedListing.title,
        image: selectedListing.image || '',
        price: selectedListing.price,
        date: new Date().toISOString(),
        sellerId: selectedListing.userId,
        sellerUsername: currentUser && currentUser.displayName ? currentUser.displayName : 'Seller',
      })
    });
    setShowSoldModal(false);
    setSelectedListing(null);
    setBuyerEmail('');
    setBuyerUsername('');
    setModalError('');
    // Optionally, refresh listings
    setMyListings(listings => listings.map(l => l.id === selectedListing.id ? { ...l, status: 'sold' } : l));
  };

  return (
    <div className="my-listings-page">
      <nav className="landing-nav glass-nav">
        <div className="landing-nav-left">
          <img src="./gt.png" alt="GT Logo" className="gt-logo" />
          <h1 className="landing-title">GT Marketplace</h1>
        </div>
        <div className="landing-nav-right">
          <button className="landing-nav-button" onClick={() => navigate('/')}>Home</button>
        </div>
      </nav>
      <header className="my-listings-header">
        <h2>My Listings</h2>
        <button className="my-new-listing-btn" onClick={() => navigate('/new-listing')}>
          + New Listing
        </button>
      </header>
      <div className="my-listings-grid">
        {loading ? (
          <div className="no-listings">Loading...</div>
        ) : myListings.length === 0 ? (
          <div className="no-listings">You have no listings yet.</div>
        ) : (
          myListings.map((listing) => (
            <div className="my-listing-card" key={listing.id}>
              <div className="my-listing-image">
                <img src={listing.image || './techtower.jpeg'} alt={listing.title} onError={e => { e.currentTarget.src = './techtower.jpeg'; }} />
                <span className={`my-listing-status ${listing.status?.toLowerCase()}`}>{listing.status}</span>
                <span className="my-listing-price">${listing.price}</span>
              </div>
              <div className="my-listing-details">
                <h4>{listing.title}</h4>
                <p className="my-listing-desc">{listing.description}</p>
                <div className="my-listing-meta">
                  <span>{listing.location}</span>
                  <span className="my-listing-date">{listing.date}</span>
                </div>
                {(!listing.status || (typeof listing.status === 'string' && listing.status.toLowerCase() === 'active')) && (
                  <button className="mark-sold-btn" onClick={() => handleMarkAsSold(listing)}>
                    Mark as Sold
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {showSoldModal && (
        <div className="sold-modal-overlay">
          <div className="sold-modal">
            <h3>Mark as Sold</h3>
            <form onSubmit={handleSoldSubmit} className="sold-modal-form">
              <label>Email of Buyer:</label>
              <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} required />
              <label>Username of Buyer:</label>
              <input type="text" value={buyerUsername} onChange={e => setBuyerUsername(e.target.value)} required />
              {modalError && <div className="modal-error">{modalError}</div>}
              <div className="sold-modal-actions">
                <button type="submit" className="confirm-sold-btn">Confirm Sold</button>
                <button type="button" className="cancel-sold-btn" onClick={() => setShowSoldModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 