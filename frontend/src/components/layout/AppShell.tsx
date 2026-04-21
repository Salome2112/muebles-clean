import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Resumen' },
  { to: '/productos', label: 'Productos' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/cotizaciones', label: 'Cotizaciones' },
  { to: '/liquidaciones', label: 'Liquidaciones' },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <span className="brand-chip">ConfortMuebles</span>
          <h1>Ventas y seguimiento en una sola app</h1>
          <p>
            Migracion del sistema HTML original a una base preparada para React,
            NestJS, Prisma y PostgreSQL.
          </p>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
