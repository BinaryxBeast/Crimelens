import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCrimeData } from '../hooks/useCrimeData';

const NAV_ITEMS = [
  { to: '/',           icon: 'dashboard',       label: 'Dashboard',       section: 'Analytics' },
  { to: '/map',        icon: 'map',             label: 'Crime Map',        section: 'Analytics' },
  { to: '/network',    icon: 'account_tree',    label: 'Network Analysis', section: 'Intelligence' },
  { to: '/predictive', icon: 'psychology',      label: 'AI Predictive',    section: 'Intelligence' },
  { to: '/reports',    icon: 'assignment',      label: 'Complaints',       section: 'Records' },
];

export default function Sidebar() {
  const { user, signOut } = useAuthStore();
  const { stats } = useCrimeData();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sections = [...new Set(NAV_ITEMS.map(n => n.section))];
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AN';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">
            <span className="material-icons">shield</span>
          </div>
          <div className="logo-text">
            <span className="logo-title">CrimeLens</span>
            <span className="logo-subtitle">KSP · SCRB Intelligence</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {NAV_ITEMS.filter(n => n.section === section).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="material-icons">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.label === 'AI Predictive' && stats?.highSeverity > 0 && (
                  <span className="nav-badge">{stats.highSeverity}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.email || 'Analyst'}</div>
            <div className="user-role">SCRB Analyst</div>
          </div>
          <button className="sign-out-btn" onClick={handleSignOut} title="Sign Out">
            <span className="material-icons">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
