import './AboutPage.css';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const storyRef = useRef<HTMLDivElement>(null);
  const safetyRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="about-page">
      <nav className="about-nav">
        <div className="about-nav-left">
          <button className="back-button" onClick={() => navigate('/')}>{'<'} Back to Home</button>
        </div>
        <div className="about-nav-center">
          <h1 className="about-title">About</h1>
        </div>
        <div className="about-nav-links">
          <button onClick={() => scrollTo(storyRef)}>Our Story</button>
          <button onClick={() => scrollTo(safetyRef)}>Safety Tips</button>
          <button onClick={() => scrollTo(termsRef)}>Terms of Service</button>
        </div>
      </nav>
      <main className="about-main">
        <section ref={storyRef} className="about-section">
          <h2>Our Story</h2>
          <p>GT Marketplace was founded by Yellow Jackets, for Yellow Jackets. Our mission is to make campus trading safe, easy, and fun for everyone at Georgia Tech. Whether you're looking to buy, sell, or trade, you're in the right place!</p>
        </section>
        <section ref={safetyRef} className="about-section">
          <h2>Safety Tips</h2>
          <ul>
            <li>Always meet in well-lit, public places on campus.</li>
            <li>Bring a friend when meeting someone new.</li>
            <li>Never share sensitive personal information.</li>
            <li>Trust your instincts—if something feels off, walk away.</li>
          </ul>
        </section>
        <section ref={termsRef} className="about-section">
          <h2>Terms of Service</h2>
          <p>By using GT Marketplace, you agree to our community guidelines and terms. Please respect other users, follow campus policies, and use the platform responsibly. Full terms coming soon.</p>
        </section>
      </main>
    </div>
  );
} 