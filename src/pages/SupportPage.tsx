import './SupportPage.css';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SupportPage() {
  const faqRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [showReportBox, setShowReportBox] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const API_URL = import.meta.env.VITE_API_URL || '';

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setReportStatus('sending');
    try {
      // Call the backend endpoint to send the report, including the current user's email
      const response = await fetch(`${API_URL}/api/report-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportText, userEmail: currentUser?.email }),
      });
      if (!response.ok) throw new Error('Failed to send report');
      setReportStatus('sent');
      setReportText('');
    } catch {
      setReportStatus('error');
    }
    setTimeout(() => setReportStatus('idle'), 3000);
  };

  return (
    <div className="support-page">
      <nav className="support-nav">
        <div className="support-nav-left">
          <button className="back-button" onClick={() => navigate('/')}>{'<'} Back to Home</button>
        </div>
        <div className="support-nav-links button-row">
          <button className="gold-button" onClick={() => scrollTo(faqRef)}>FAQ</button>
          <button className="gold-button" onClick={() => scrollTo(contactRef)}>Contact Us</button>
          <button className="gold-button" onClick={() => scrollTo(reportRef)}>Report an Issue</button>
        </div>
      </nav>
      <main className="support-main">
        <h1 className="page-title">Support</h1>
        <section ref={faqRef} className="support-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3>How do I create a listing?</h3>
              <p>Click the "New Listing" button in the navigation bar. Fill in the details about your item, add photos, set a price, and optionally add tags and trade-for items. Click "Create Listing" to post it to the marketplace.</p>
            </div>
            <div className="faq-item">
              <h3>How do I mark an item as sold?</h3>
              <p>Go to "My Listings" and find the item you want to mark as sold. Click the "Mark as Sold" button and enter the buyer's information. The item will be removed from the marketplace but remain in your purchase history.</p>
            </div>
            <div className="faq-item">
              <h3>How do I message a seller?</h3>
              <p>Click on any listing to view its details. You'll see a "Message Seller" button that will open a chat with the seller. You can also access all your conversations from the "Messages" section in the navigation bar.</p>
            </div>
            <div className="faq-item">
              <h3>Can I trade items instead of selling?</h3>
              <p>Yes! When creating a listing, you can specify items you're willing to trade for. Other users can see these trade preferences and message you to negotiate a swap.</p>
            </div>
            <div className="faq-item">
              <h3>How do I update my profile?</h3>
              <p>Click on your profile picture in the top right corner and select "Edit Profile." From there, you can update your username, profile picture, and other account information.</p>
            </div>
          </div>
        </section>
        <section ref={contactRef} className="support-section">
          <h2>Contact Us</h2>
          <p>Email: <a href="mailto:support@gtmarketplace.com">support@gtmarketplace.com</a></p>
          <p>We aim to respond to all inquiries within 24 hours.</p>
        </section>
        <section ref={reportRef} className="support-section">
          <h2>Report an Issue</h2>
          <p>If you encounter a bug or inappropriate behavior, please let us know. We take your safety and experience seriously.</p>
          <button className="report-btn" onClick={() => setShowReportBox(v => !v)}>
            {showReportBox ? 'Cancel' : 'Report an Issue'}
          </button>
          {showReportBox && (
            <form className="report-issue-form" onSubmit={handleReportSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: 520 }}>
              <textarea
                className="report-issue-textarea"
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={5}
                required
                style={{ borderRadius: '1rem', padding: '1rem', fontSize: '1.1rem', border: '1.5px solid #e6c97a', resize: 'vertical', minHeight: 100 }}
              />
              <button className="report-btn" type="submit" disabled={reportStatus === 'sending' || !reportText.trim()} style={{ width: 'fit-content', alignSelf: 'flex-end', minWidth: 120 }}>
                {reportStatus === 'sending' ? 'Sending...' : 'Submit'}
              </button>
              {reportStatus === 'sent' && <div style={{ color: '#4ade80', fontWeight: 700 }}>Thank you! Your issue has been reported.</div>}
              {reportStatus === 'error' && <div style={{ color: '#f87171', fontWeight: 700 }}>Failed to send. Please try again.</div>}
            </form>
          )}
        </section>
      </main>
    </div>
  );
} 