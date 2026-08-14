import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { ToastContainer } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import { ClientsPage } from './pages/ClientsPage'
import { PetsPage } from './pages/PetsPage'
import { AppointmentsPage } from './pages/AppointmentsPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/clients" replace />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="pets" element={<PetsPage />} />
                  <Route path="appointments" element={<AppointmentsPage />} />
                </Route>
              </Routes>
              <ToastContainer />
            </div>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
