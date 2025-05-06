import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './NewListingPage.css';
import { useAuth } from '../contexts/AuthContext';

const sampleTags = [
  'Textbooks', 'Electronics', 'Clothing', 'Housing', 'Furniture', 'Tickets', 'Services', 'Appliances', 'Other'
];

export default function NewListingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tradeFor, setTradeFor] = useState('');

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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title || !price || !location || !description) {
      setError('Please fill in all fields.');
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
        tags: selectedTags,
        tradeFor,
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
          <img src="./gt.png" alt="GT Logo" className="gt-logo" />
          <h1 className="landing-title">GT Marketplace</h1>
        </div>
        <div className="landing-nav-right">
          <button className="landing-nav-button" onClick={() => navigate('/')}>Home</button>
        </div>
      </nav>
      <div className="new-listing-form-container wide">
        <h2>Create New Listing</h2>
        <div className="listing-image-preview">
          <img src={imageUrl || './techtower.jpeg'} alt="Preview" />
        </div>
        <form className="new-listing-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
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
            />
          </div>
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
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
                  className={`tag-btn${selectedTags.includes(tag) ? ' selected' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="tradeFor">Items Willing to Trade For (Enter as a comma separated list)</label>
            <input
              type="text"
              id="tradeFor"
              value={tradeFor}
              onChange={(e) => setTradeFor(e.target.value)}
              placeholder="Enter items you are willing to trade for"
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
  );
} 