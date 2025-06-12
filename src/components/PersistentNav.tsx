import { useNavigate } from 'react-router-dom';
import './PersistentNav.css';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface PersistentNavProps {
  handleProfileClick: () => void;
  handleEditProfile: () => void;
  handleLogout: () => void;
}

const PersistentNav: React.FC<PersistentNavProps> = ({
  handleProfileClick,
  handleEditProfile,
  handleLogout,
}) => {
  const navigate = useNavigate();
  const { username, profilePicture, notifCount, showDropdown, dropdownClosing } = useSelector(
    (state: RootState) => state.user
  );
  return (
    <nav className="landing-nav glass-nav">
      <div className="landing-nav-left" style={{ cursor: 'pointer' }} onClick={() => navigate('/') }>
        <img src="./logo.png" alt="GT Logo" className="gt-logo" />
        <h1 className="landing-title">GT Marketplace</h1>
      </div>
      <div className="landing-nav-center">
        {username && (
          <div className="nav-links">
            <span className="nav-link" onClick={() => navigate('/explore')}>Explore</span>
            <span className={`nav-link${notifCount > 0 ? ' has-badge' : ''}`} onClick={() => navigate('/messages')}>
              Messages
              {notifCount > 0 && (
                <span className="notif-badge">{notifCount}</span>
              )}
            </span>
            <span className="nav-link" onClick={() => navigate('/purchase-history')}>Purchase History</span>
            <span className="nav-link" onClick={() => navigate('/my-listings')}>My Listings</span>
          </div>
        )}
      </div>
      <div className="landing-nav-right">
        {username ? (
          <div className="user-section" onClick={handleProfileClick} style={{ position: 'relative' }}>
            <img src={profilePicture || './default-avatar.png'} alt="Profile" className="profile-pic" />
            <span className="username">{username}</span>
            {(showDropdown || dropdownClosing) && (
              <div className={`profile-dropdown${dropdownClosing ? ' closing' : ''}`}> 
                <button onClick={handleEditProfile}>Edit Profile</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <button className="landing-nav-button" onClick={() => navigate('/login')}>Login</button>
        )}
      </div>
    </nav>
  );
};

export default PersistentNav; 