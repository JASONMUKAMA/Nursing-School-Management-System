import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../context/SidebarContext';
import { getPrimaryRole, ROLES } from '../../utils/roles';

import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const { user, logout } = useAuth();
  const { toggleMobile } = useSidebar();

  if (!user) return null;

  const primaryRole = getPrimaryRole(user);

  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleMobile}
          aria-label="Open navigation menu"
        >
          ☰
        </button>
        <div className="header-info">
          <span className="header-greeting">Welcome back,</span>
          <strong>{user.userName}</strong>
          <span className="role-badge">{ROLES[primaryRole]}</span>
        </div>
      </div>

      <div className="header-right">
        <NotificationBell />
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
