import type { ReactNode } from 'react';

export interface PageNavItem {
  id: string;
  label: string;
  icon?: string;
}

interface PageWithSideNavProps {
  title: string;
  description?: string;
  navItems: PageNavItem[];
  activeId: string;
  onNavChange: (id: string) => void;
  alerts?: ReactNode;
  children: ReactNode;
}

export function PageWithSideNav({
  title,
  description,
  navItems,
  activeId,
  onNavChange,
  alerts,
  children,
}: PageWithSideNavProps) {
  const showNav = navItems.length > 1;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{title}</h2>
        {description && <p className="text-muted">{description}</p>}
      </div>

      {alerts}

      <div className={`page-with-sidenav${showNav ? '' : ' page-with-sidenav-single'}`}>
        {showNav && (
          <nav className="page-sidenav" aria-label={`${title} sections`}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`page-sidenav-link${activeId === item.id ? ' active' : ''}`}
                onClick={() => onNavChange(item.id)}
              >
                {item.icon && <span className="page-sidenav-icon">{item.icon}</span>}
                <span className="page-sidenav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="page-sidenav-content">{children}</div>
      </div>
    </div>
  );
}
