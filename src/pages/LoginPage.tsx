import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, currentUser } = useAuth();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/landing');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Prevent scrolling on login page
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleCreateAccount = () => {
    setShowCreateAccount(true);
  };

  const handleSubmitCreateAccount = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await signup(email, password, username, profilePicFile || undefined);
      setMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        setMessage('');
        navigate('/landing');
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please try logging in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        setMessage('');
        navigate('/landing');
      }, 1500);
    } catch (error) {
      setError('Invalid email or password');
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        setMessage('');
        navigate('/landing');
      }, 1500);
    } catch (error) {
      setError('Google login failed. Please try again.');
      console.error('Google login error:', error);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (showCreateAccount) {
    return (
      <div className="login-split-bg">
        <div className="login-split-card">
          <div className="login-split-left">
            <img src="./techtower.jpeg" alt="Tech Tower" className="login-illustration" />
            <div className="login-welcome-title">Welcome to GT Marketplace</div>
            <div className="login-welcome-desc">Create your account to buy, sell, and connect with the Georgia Tech community!</div>
          </div>
          <div className="login-split-right">
            <div className="login-title gold-gradient-title">Create Account</div>
            <form className="login-form" onSubmit={e => { e.preventDefault(); handleSubmitCreateAccount(); }}>
              <input 
                type="email" 
                placeholder="Email" 
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input 
                type="text" 
                placeholder="Username" 
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="login-input"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <label className="profile-pic-label">Upload Profile Picture</label>
              <label htmlFor="profile-pic-upload" className="profile-pic-upload-btn">
                {profilePicFile ? profilePicFile.name : 'Choose File'}
              </label>
              <input
                id="profile-pic-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => setProfilePicFile(e.target.files?.[0] || null)}
              />
              <div className="button-row-left">
                <button type="submit" className="login-button cream-btn">Create Account</button>
                <button type="button" className="login-button cream-btn" onClick={() => setShowCreateAccount(false)}>Back to Login</button>
              </div>
              {error && <p className="error-message">{error}</p>}
              {message && <p className="message">{message}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-split-bg">
      <div className="login-split-card">
        <div className="login-split-left">
          <img src="./techtower.jpeg" alt="Tech Tower" className="login-illustration" />
          <div className="login-welcome-title">Welcome to GT Marketplace</div>
          <div className="login-welcome-desc">The ultimate campus marketplace for Yellow Jackets. Buy, sell, and connect with your Georgia Tech community!</div>
        </div>
        <div className="login-split-right">
          <div className="login-title gold-gradient-title">GT Marketplace</div>
          <form className="login-form" onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Email" 
              className = "login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              className = "login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="login-button">Sign In</button>
          </form>
          <div className="google-btn-row">
            <button className="login-google" onClick={handleGoogleLogin}>
              <img src="./google.png" alt="Google" className="login-icon" />
              <span className="google-btn-text">Login with Google</span>
            </button>
          </div>
          <div className="login-options">
            <a href="#" className="login-link" onClick={() => navigate('/reset-password')}>Forgot Password?</a>
            <a href="#" className="login-link" onClick={handleCreateAccount}>Create Account</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 