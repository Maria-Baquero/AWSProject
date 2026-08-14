import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/clients', label: 'Clientes' },
  { to: '/pets', label: 'Mascotas' },
  { to: '/appointments', label: 'Citas' },
]

export function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-700 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">VetClinic</h1>
          <p className="text-indigo-200 text-sm mt-1">Panel de Administración</p>
        </div>

        <nav className="flex-1 px-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-800 text-white font-medium'
                        : 'text-indigo-100 hover:bg-indigo-600'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-indigo-600">
          <button
            className="w-full px-4 py-2 text-sm text-indigo-200 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
            onClick={() => {
              // Logout logic will be implemented in auth task
              localStorage.removeItem('token')
              window.location.href = '/login'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
