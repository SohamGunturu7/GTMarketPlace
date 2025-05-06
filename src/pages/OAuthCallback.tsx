import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OAuthCallback.css';
import { useAuth } from '../contexts/AuthContext';

function OAuthCallback() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/landing');
    } else {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <div className="callback-container">
      <h2>Processing login...</h2>
    </div>
  );
}

export default OAuthCallback; 