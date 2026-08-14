import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ClientsPage } from '../ClientsPage'
import { ToastProvider } from '../../hooks/useToast'

// Mock services
vi.mock('../../services/clientService', () => ({
  getClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}))

import { getClients } from '../../services/clientService'

const mockGetClients = vi.mocked(getClients)

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function renderPage() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ClientsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no clients exist', async () => {
    mockGetClients.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })

    renderPage()

    expect(await screen.findByText('No hay clientes registrados')).toBeInTheDocument()
    expect(screen.getByText('Crear primer cliente')).toBeInTheDocument()
  })

  it('renders the client list with correct data', async () => {
    mockGetClients.mockResolvedValue({
      data: [
        {
          id: '1',
          fullName: 'Juan Pérez',
          phone: '1234567890',
          email: 'juan@email.com',
          address: 'Calle 123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          fullName: 'María García',
          phone: '0987654321',
          email: 'maria@email.com',
          address: null,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    })

    renderPage()

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
    expect(screen.getByText('1234567890')).toBeInTheDocument()
    expect(screen.getByText('juan@email.com')).toBeInTheDocument()
  })

  it('shows search input', async () => {
    mockGetClients.mockResolvedValue({
      data: [
        {
          id: '1',
          fullName: 'Juan Pérez',
          phone: '1234567890',
          email: 'juan@email.com',
          address: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    renderPage()

    await screen.findByText('Juan Pérez')
    expect(screen.getByPlaceholderText('Buscar por nombre o teléfono...')).toBeInTheDocument()
  })

  it('shows pagination when there are multiple pages', async () => {
    mockGetClients.mockResolvedValue({
      data: [
        {
          id: '1',
          fullName: 'Juan Pérez',
          phone: '1234567890',
          email: 'juan@email.com',
          address: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 25,
      page: 1,
      totalPages: 3,
    })

    renderPage()

    await screen.findByText('Juan Pérez')
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockGetClients.mockReturnValue(new Promise(() => {})) // never resolves

    renderPage()

    expect(screen.getByText('Cargando clientes...')).toBeInTheDocument()
  })

  it('shows the Nuevo Cliente button', async () => {
    mockGetClients.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })

    renderPage()

    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument()
  })
})
