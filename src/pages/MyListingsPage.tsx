import './MyListingsPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PersistentNav from '../components/PersistentNav';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
  const [quantitySold, setQuantitySold] = useState('1');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);

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
    setQuantitySold('1');
  };

  const handleSoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail || !buyerUsername || !selectedListing) {
      setModalError('Please enter both email and username.');
      return;
    }
    const parsedQuantity = parseInt(quantitySold, 10);
    if (!parsedQuantity || parsedQuantity < 1 || parsedQuantity > (selectedListing.quantity || 1)) {
      setModalError('Please enter a valid quantity to sell.');
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
    // Update the listing quantity or status
    const newQuantity = (selectedListing.quantity || 1) - parsedQuantity;
    if (newQuantity > 0) {
      await updateDoc(doc(db, 'listings', selectedListing.id), { quantity: newQuantity, updatedAt: serverTimestamp() });
      // Record partial sale in recent activity (Firestore or Redux)
      // We'll add a 'recentSales' subcollection for this listing
      await updateDoc(doc(db, 'listings', selectedListing.id), {
        recentSale: {
          quantity: parsedQuantity,
          date: new Date().toISOString(),
          buyerEmail,
          buyerUsername,
        }
      });
    } else {
      await updateDoc(doc(db, 'listings', selectedListing.id), { status: 'sold', quantity: 0, updatedAt: serverTimestamp() });
    }
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
        quantity: parsedQuantity,
      })
    });
    setShowSoldModal(false);
    setSelectedListing(null);
    setBuyerEmail('');
    setBuyerUsername('');
    setModalError('');
    setQuantitySold('1');
    // Optionally, refresh listings
    setMyListings(listings => listings.map(l => l.id === selectedListing.id ? { ...l, quantity: Math.max(0, (l.quantity || 1) - parsedQuantity), status: (newQuantity > 0 ? l.status : 'sold'), lastSoldQuantity: parsedQuantity, lastSoldDate: new Date().toISOString() } : l));
  };

  const handleDeleteListing = (listingId: string) => {
    setDeleteListingId(listingId);
    setShowDeleteModal(true);
  };

  const confirmDeleteListing = async () => {
    if (!deleteListingId) return;
    try {
      await deleteDoc(doc(db, 'listings', deleteListingId));
      setMyListings(prev => prev.filter(listing => listing.id !== deleteListingId));
    } catch (err) {
      alert('Failed to delete listing. Please try again.');
    }
    setShowDeleteModal(false);
    setDeleteListingId(null);
  };

  const cancelDeleteListing = () => {
    setShowDeleteModal(false);
    setDeleteListingId(null);
  };

  return (
    <div className="my-listings-page">
      <PersistentNav
        handleProfileClick={() => {}}
        handleEditProfile={() => {}}
        handleLogout={() => {}}
      />
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
                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.7rem', marginTop: '10px' }}>
                  {(!listing.status || (typeof listing.status === 'string' && listing.status.toLowerCase() === 'active')) && (
                    <button
                      className="mark-sold-btn"
                      onClick={() => handleMarkAsSold(listing)}
                    >
                      Mark as Sold
                    </button>
                  )}
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteListing(listing.id)}
                  >
                    Delete
                  </button>
                </div>
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
              <label>Quantity to Sell (Available: {selectedListing?.quantity || 1}):</label>
              <input type="text" value={quantitySold} onChange={e => setQuantitySold(e.target.value.replace(/[^0-9]/g, ''))} required />
              {modalError && <div className="modal-error">{modalError}</div>}
              <div className="sold-modal-actions">
                <button type="submit" className="confirm-sold-btn">Confirm Sold</button>
                <button type="button" className="cancel-sold-btn" onClick={() => setShowSoldModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="sold-modal-overlay">
          <div className="sold-modal delete-modal">
            <h3>Delete Listing</h3>
            <p>Are you sure you want to delete this listing? This action cannot be undone.</p>
            <div className="sold-modal-actions">
              <button className="confirm-sold-btn" onClick={confirmDeleteListing}>Delete</button>
              <button className="cancel-sold-btn" onClick={cancelDeleteListing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 