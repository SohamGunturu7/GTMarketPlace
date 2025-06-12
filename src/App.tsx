import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import ListingPage from './pages/MyListingsPage';
import NewListingPage from './pages/NewListingPage';
import MessagesPage from './pages/MessagesPage';
import PurchasePage from './pages/PurchaseHistoryPage';
import AboutPage from './pages/AboutPage';
import SupportPage from './pages/SupportPage';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import { Provider } from 'react-redux';
import { store } from './store';

import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/my-listings" element={<ListingPage />} />
            <Route path="/new-listing" element={<NewListingPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/purchase-history" element={<PurchasePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
