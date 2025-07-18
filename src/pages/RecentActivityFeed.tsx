import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './RecentActivityFeed.css';

interface Listing {
  id: string;
  title: string;
  createdAt: any;
  updatedAt?: any;
  status?: string;
  price?: number;
  tags?: string[];
  sellerUsername?: string;
  imageUrl?: string;
  userId?: string;
  sellerId?: string;
  quantity?: number;
}

export default function RecentActivityFeed() {
  const [activities, setActivities] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchRecent() {
      setLoading(true);
      if (!currentUser) {
        setActivities([]);
        setLoading(false);
        return;
      }
      // Fetch recent listings
      const q = query(
        collection(db, 'listings'),
        orderBy('updatedAt', 'desc'),
        limit(12)
      );
      const snapshot = await getDocs(q);
      const items: Listing[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          status: data.status,
          price: data.price,
          tags: data.tags,
          sellerUsername: data.sellerUsername,
          imageUrl: data.imageUrl,
          userId: data.userId,
          sellerId: data.sellerId,
        });
      });
      
      // Get sold/listed items
      const soldListings = items.filter(item => item.userId === currentUser.uid);
      
      // Fetch purchaseHistory for the current user
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      let purchaseArr: any[] = [];
      if (userDoc.exists()) {
        purchaseArr = userDoc.data().purchaseHistory || [];
      }
      const boughtItems = purchaseArr.map(p => ({
        id: p.listingId,
        title: p.title,
        createdAt: p.date || new Date().toISOString(),
        status: 'bought',
        price: p.price,
        sellerUsername: p.sellerUsername || 'Seller',
        imageUrl: p.image || p.imageUrl || './techtower.jpeg',
        sellerId: p.sellerId,
        userId: currentUser.uid,
        quantity: p.quantity, // ensure quantity is included
      }));
      
      // Merge and sort all activities
      const filtered = [...soldListings, ...boughtItems].sort((a, b) => {
        const getTime = (item: any) => {
          if (item.updatedAt && typeof item.updatedAt.toDate === 'function') {
            return item.updatedAt.toDate().getTime();
          }
          if (item.createdAt && typeof item.createdAt.toDate === 'function') {
            return item.createdAt.toDate().getTime();
          }
          return new Date(item.createdAt).getTime();
        };
        return getTime(b) - getTime(a);
      });
      
      setActivities(filtered);
      setLoading(false);
    }
    fetchRecent();
  }, [currentUser]);

  useEffect(() => {
    async function fetchMissingSellerUsernames() {
      const missing = activities.filter(a => a.status === 'bought' && !a.sellerUsername && a.sellerId);
      if (missing.length === 0) return;
      const updates: { [id: string]: string } = {};
      for (const act of missing) {
        if (typeof act.sellerId === 'string' && act.sellerId) {
          try {
            const sellerDoc = await getDoc(doc(db, 'users', act.sellerId));
            if (sellerDoc.exists()) {
              updates[act.id] = sellerDoc.data().username || 'Seller';
            }
          } catch {}
        }
      }
      if (Object.keys(updates).length > 0) {
        setActivities(prev => prev.map(a => (a.status === 'bought' && updates[a.id]) ? { ...a, sellerUsername: updates[a.id] } : a));
      }
    }
    fetchMissingSellerUsernames();
  }, [activities]);

  function formatTime(ts: any) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return date.toLocaleDateString();
  }

  return (
    <section className="recent-activity-section">
      <div className="recent-activity-bg"></div>
      <h3 className="recent-activity-title">Recent Activity</h3>
      <div className="recent-activity-feed">
        {loading ? (
          <div className="recent-activity-loading">Loading...</div>
        ) : !currentUser ? (
          <div className="recent-activity-empty">
            <div className="empty-illustration" role="img" aria-label="No activity">🕊️</div>
            <div>No recent activity yet.</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="recent-activity-empty">
            <div className="empty-illustration" role="img" aria-label="No activity">🕊️</div>
            <div>No recent activity yet.</div>
          </div>
        ) : (
          activities.slice(0, 2).map((item, idx) => {
            let time = item.createdAt;
            const anyItem = item as any;
            if (anyItem && anyItem.updatedAt) {
              time = anyItem.updatedAt;
            }
            // Determine if this is a partial sale or purchase
            const soldQuantity = (item as any).lastSoldQuantity || (item as any).recentSale?.quantity;
            const boughtQuantity = (item as any).quantity && item.status === 'bought' ? (item as any).quantity : null;
            return (
              <div
                className="recent-activity-item animated-entry"
                key={item.id}
                style={{ animationDelay: `${0.08 * idx + 0.1}s` }}
              >
                <div className="recent-activity-thumb-wrap">
                  <div className="recent-activity-thumb">
                    <img src={item.imageUrl || './techtower.jpeg'} alt={item.title} onError={e => { e.currentTarget.src = './techtower.jpeg'; }} />
                  </div>
                </div>
                <div className="recent-activity-info">
                  <div className="activity-type-pill-wrap">
                    <span className={`activity-type-pill ${item.status === 'sold' ? 'sold' : item.status === 'bought' ? 'bought' : 'listed'}`}>{item.status === 'sold' && item.userId === currentUser.uid ? 'Sold' : item.status === 'bought' ? 'Bought' : 'Listed'}</span>
                  </div>
                  <div className="activity-title-row">
                    <b className="activity-title">{item.title}</b>
                    {item.price !== undefined && <span className="activity-price">${item.price}</span>}
                  </div>
                  <div className="activity-meta-row">
                    <span className="recent-activity-time">{formatTime(time)}</span>
                    {item.status !== 'bought' && item.sellerUsername && (
                      <span className="seller-name">by {item.sellerUsername}</span>
                    )}
                    {soldQuantity && item.status !== 'sold' && (
                      <span className="sold-quantity">
                        <span className="quantity-badge" title="Quantity Sold">{soldQuantity}</span>
                        {typeof item.quantity === 'number' && item.quantity > 0 ? (
                          <span style={{ fontSize: '0.98em', color: '#a0aec0', fontWeight: 500, marginLeft: 6 }}>
                            ({item.quantity} left)
                          </span>
                        ) : (
                          <span className="sold-out-badge" title="Sold Out">Sold Out</span>
                        )}
                      </span>
                    )}
                    {boughtQuantity && item.status === 'bought' && (
                      <span className="bought-quantity">
                        <span style={{ fontSize: '0.98em', color: '#a0aec0', fontWeight: 500, marginRight: 4 }}>Qty:</span>
                        <span className="quantity-badge">{boughtQuantity}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
} 