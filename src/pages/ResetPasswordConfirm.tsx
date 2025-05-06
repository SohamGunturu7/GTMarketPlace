import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase/config';
import './LoginPage.css';

export default function ResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill out both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage('Password reset successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError('Failed to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (mode !== 'resetPassword' || !oobCode) {
    return (
      <div className="login-background">
        <div className="login-glass-card">
          <div className="login-title gold-gradient-title">Invalid Link</div>
          <p className="error-message">This password reset link is invalid or missing.</p>
          <button className="login-button" onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-background">
      <div className="login-glass-card">
        <div className="login-title gold-gradient-title">Set New Password</div>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New Password"
            className="login-input"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            className="login-input"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          {message && <p className="message">{message}</p>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <button className="login-button" style={{ background: 'white', color: '#003057', border: '1px solid #003057', marginTop: 16 }} onClick={() => navigate('/login')}>
          Back to Login
        </button>
      </div>
    </div>
  );
} 