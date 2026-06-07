import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

function AppLayoutShell() {
  const { mobileOpen, closeMobile } = useSidebar();

  return (
    <div className={`app-layout${mobileOpen ? ' sidebar-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close navigation"
        onClick={closeMobile}
        tabIndex={mobileOpen ? 0 : -1}
      />
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutShell />
    </SidebarProvider>
  );
}
