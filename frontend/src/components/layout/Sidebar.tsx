import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../hooks/useAuth';
import { getNavGroupsForUser, type NavItem } from '../../utils/roles';

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.children?.length) {
    return item.children.some((child) => child.path && pathname.startsWith(child.path));
  }
  return item.path ? pathname === item.path || pathname.startsWith(`${item.path}/`) : false;
}

function SidebarNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { pathname } = useLocation();
  const hasChildren = !!item.children?.length;
  const childActive = hasChildren && isItemActive(pathname, item);
  const [open, setOpen] = useState(childActive);
  const expanded = childActive || open;

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [childActive, pathname]);

  if (hasChildren) {
    return (
      <li className={`sidebar-nav-item${expanded ? ' is-expanded' : ' is-collapsed'}`}>
        <button
          type="button"
          className="nav-link nav-link-parent"
          onClick={() => {
            if (childActive) return;
            setOpen((value) => !value);
          }}
          aria-expanded={expanded}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          <span className="nav-chevron" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        </button>
        <ul className="sidebar-subnav">
          {item.children!.map((child) => (
            <li key={child.path}>
              <NavLink
                to={child.path!}
                end
                className={({ isActive }) => `nav-sublink${isActive ? ' active' : ''}`}
                onClick={onNavigate}
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li className="sidebar-nav-item">
      <NavLink
        to={item.path!}
        end
        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        onClick={onNavigate}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </NavLink>
    </li>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { closeMobile } = useSidebar();
  const navGroups = getNavGroupsForUser(user);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🏫</span>
        <div>
          <h1>NSMS</h1>
          <p>Nursing School</p>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div key={group.id} className="sidebar-group">
            <p className="sidebar-group-label">{group.label}</p>
            <ul className="sidebar-group-list">
              {group.items.map((item) => (
                <SidebarNavItem key={item.path ?? item.label} item={item} onNavigate={closeMobile} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
