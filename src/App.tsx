import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import ListingPage from './pages/MyListingsPage';
import NewListingPage from './pages/NewListingPage';
import MessagesPage from './pages/MessagesPage';
import PurchasePage from './pages/PurchaseHistoryPage';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/my-listings" element={<ListingPage />} />
          <Route path="/new-listing" element={<NewListingPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/purchase-history" element={<PurchasePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
