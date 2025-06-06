import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './NewListingPage.css';
import { useAuth } from '../contexts/AuthContext';
import CampusMap from './CampusMap';

const sampleTags = [
  'Textbooks', 'Electronics', 'Clothing', 'Housing', 'Furniture', 'Tickets', 'Services', 'Appliances', 'Other'
];

export default function NewListingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setImageUrl(URL.createObjectURL(e.target.files[0]));
    } else {
      setImage(null);
      setImageUrl('./techtower.jpeg');
    }
  };

  const handleTagClick = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      setShowMapModal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title || !price || !location || !description) {
      setError('Please fill in all fields.');
      return;
    }
    if (!marker) {
      setError('Please set a coordinate pin for your item on the map.');
      return;
    }
    setLoading(true);
    try {
      let url = './tech-tower.png';
      if (image) {
        // Upload image to Firebase Storage
        const imageRef = ref(storage, `listing-images/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        url = await getDownloadURL(imageRef);
        setImageUrl(url);
      }
      // Add listing to Firestore
      await addDoc(collection(db, 'listings'), {
        title,
        price: parseFloat(price),
        location,
        description,
        image: url,
        status: 'Active',
        date: new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp(),
        userId: currentUser?.uid,
        tags,
        tradeFor,
        lat: marker?.lat || null,
        lng: marker?.lng || null,
      });
      setSuccess('Listing created successfully!');
      setTimeout(() => navigate('/my-listings'), 1200);
    } catch (err) {
      setError('Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-listing-page">
      <nav className="landing-nav glass-nav">
        <div className="landing-nav-left">
          <img src="./logo.png" alt="GT Logo" className="gt-logo" />
          <h1 className="landing-title">GT Marketplace</h1>
        </div>
        <div className="landing-nav-right">
          <button className="landing-nav-button" onClick={() => navigate('/')}>Home</button>
        </div>
      </nav>
      <div className="new-listing-form-container wide">
        <h2>Create New Listing</h2>
        <div className="new-listing-form-columns">
          <div className="form-col">
            <div className="section-header">Image & Tags</div>
            <div className="section-card">
              <div className="listing-image-preview">
                <img src={imageUrl || './techtower.jpeg'} alt="Preview" />
              </div>
              <div className="form-group">
                <label htmlFor="image">Image</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              <div className="form-group">
                <label>Tags</label>
                <div className="tag-list">
                  {sampleTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn${tags.includes(tag) ? ' selected' : ''}`}
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="tradeFor">Items Willing to Trade For (comma separated)</label>
                <input
                  type="text"
                  id="tradeFor"
                  value={tradeFor}
                  onChange={(e) => setTradeFor(e.target.value)}
                  placeholder="Enter items you are willing to trade for"
                />
              </div>
            </div>
          </div>
          <div className="form-col">
            <div className="section-header">Listing Details</div>
            <div className="section-card">
              <form className="new-listing-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder=" "
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price ($)</label>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder=" "
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder=" "
                    />
                    <button type="button" className="set-map-btn" onClick={() => setShowMapModal(true)}>
                      Set on Map
                    </button>
                  </div>
                  {marker && (
                    <div style={{ fontSize: '0.95rem', color: '#003057', marginTop: '0.3rem' }}>
                      Pin set at: <b>({marker.lat.toFixed(5)}, {marker.lng.toFixed(5)})</b>
                      <button type="button" style={{ marginLeft: 8, color: '#bfa14a', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setMarker(null)}>Clear</button>
                    </div>
                  )}
                </div>
                {showMapModal && (
                  <div className="map-modal-overlay fullscreen" onClick={() => setShowMapModal(false)}>
                    <div className="map-modal fullscreen" onClick={e => e.stopPropagation()}>
                      <button className="close-map-btn" onClick={() => setShowMapModal(false)}>&times;</button>
                      <CampusMap onMapClick={handleMapClick} marker={marker} showMap={true} />
                      <div style={{ marginTop: 12, color: '#003057', fontWeight: 600 }}>Click on the map to set a pin for your listing location.</div>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder=" "
                  />
                </div>
                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">{success}</div>}
                <button className="submit-listing-btn" type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Listing'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 