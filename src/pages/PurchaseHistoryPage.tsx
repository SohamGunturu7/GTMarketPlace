import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import './MyListingsPage.css';
import PersistentNav from '../components/PersistentNav';

export default function PurchaseHistoryPage() {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sellerMap, setSellerMap] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchPurchases = async () => {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      let purchaseArr = [];
      if (userDoc.exists()) {
        purchaseArr = userDoc.data().purchaseHistory || [];
        setPurchases(purchaseArr);
      }
      // Fetch seller usernames
      const sellerIds = Array.from(new Set((purchaseArr || []).map((p: any) => p.sellerId).filter(Boolean)));
      if (sellerIds.length > 0) {
        const sellersQuery = query(collection(db, 'users'), where('__name__', 'in', sellerIds.slice(0, 10)));
        // Firestore 'in' queries are limited to 10
        const sellerSnaps = await getDocs(sellersQuery);
        const map: { [uid: string]: string } = {};
        sellerSnaps.forEach(snap => {
          const data = snap.data();
          map[snap.id] = data.username || snap.id;
        });
        setSellerMap(map);
      }
      setLoading(false);
    };
    fetchPurchases();
  }, [currentUser]);

  return (
    <div className="my-listings-page">
      <PersistentNav
        handleProfileClick={() => {}}
        handleEditProfile={() => {}}
        handleLogout={() => {}}
      />
      <header className="my-listings-header">
        <h2>Purchase History</h2>
      </header>
      <div className="my-listings-grid">
        {loading ? (
          <div className="no-listings">Loading...</div>
        ) : purchases.length === 0 ? (
          <div className="no-listings">No purchases yet.</div>
        ) : (
          purchases.map((purchase, idx) => (
            <div className="my-listing-card" key={purchase.listingId + idx}>
              <div className="my-listing-image">
                <img src={purchase.image || './techtower.jpeg'} alt={purchase.title} onError={e => { e.currentTarget.src = './techtower.jpeg'; }} />
                <span className="my-listing-price">${purchase.price}</span>
              </div>
              <div className="my-listing-details">
                <h4>{purchase.title}</h4>
                <div className="my-listing-meta">
                  <span>Purchased: {new Date(purchase.date).toLocaleDateString()}</span>
                  <span className="my-listing-date">Seller: {sellerMap[purchase.sellerId] || purchase.sellerId}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 