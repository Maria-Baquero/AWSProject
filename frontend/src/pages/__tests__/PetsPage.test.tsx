import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PetsPage } from '../PetsPage'
import { ToastProvider } from '../../hooks/useToast'

// Mock services
vi.mock('../../services/petService', () => ({
  getPets: vi.fn(),
  createPet: vi.fn(),
  updatePet: vi.fn(),
  deletePet: vi.fn(),
  getClients: vi.fn(),
}))

import { getPets, getClients } from '../../services/petService'

const mockGetPets = vi.mocked(getPets)
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
          <PetsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('PetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClients.mockResolvedValue([])
  })

  it('shows empty state when no pets exist', async () => {
    mockGetPets.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })

    renderPage()

    expect(await screen.findByText('No hay mascotas registradas')).toBeInTheDocument()
    expect(screen.getByText('Crear Primera Mascota')).toBeInTheDocument()
  })

  it('renders the pet list with correct data', async () => {
    mockGetPets.mockResolvedValue({
      data: [
        {
          id: '1',
          clientId: 'c1',
          name: 'Firulais',
          species: 'Perro',
          breed: 'Labrador',
          birthDate: null,
          weight: 25.5,
          microchipNumber: null,
          medicalNotes: null,
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          client: { fullName: 'Juan Pérez' },
        },
        {
          id: '2',
          clientId: 'c2',
          name: 'Michi',
          species: 'Gato',
          breed: 'Siamés',
          birthDate: null,
          weight: 4.2,
          microchipNumber: null,
          medicalNotes: null,
          active: true,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          client: { fullName: 'María García' },
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    })

    renderPage()

    expect(await screen.findByText('Firulais')).toBeInTheDocument()
    expect(screen.getByText('Michi')).toBeInTheDocument()
    expect(screen.getByText('Perro')).toBeInTheDocument()
    expect(screen.getByText('Gato')).toBeInTheDocument()
    expect(screen.getByText('Labrador')).toBeInTheDocument()
    expect(screen.getByText('Siamés')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María García')).toBeInTheDocument()
  })

  it('shows search input when pets exist', async () => {
    mockGetPets.mockResolvedValue({
      data: [
        {
          id: '1',
          clientId: 'c1',
          name: 'Firulais',
          species: 'Perro',
          breed: null,
          birthDate: null,
          weight: null,
          microchipNumber: null,
          medicalNotes: null,
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          client: { fullName: 'Juan' },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    renderPage()

    await screen.findByText('Firulais')
    expect(
      screen.getByPlaceholderText('Buscar por nombre, especie o raza...')
    ).toBeInTheDocument()
  })

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup()
    mockGetPets.mockResolvedValue({
      data: [
        {
          id: '1',
          clientId: 'c1',
          name: 'Firulais',
          species: 'Perro',
          breed: null,
          birthDate: null,
          weight: null,
          microchipNumber: null,
          medicalNotes: null,
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          client: { fullName: 'Juan' },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    })

    renderPage()

    await screen.findByText('Firulais')

    const deleteBtn = screen.getByText('Eliminar')
    await user.click(deleteBtn)

    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument()
    expect(screen.getByText(/¿Estás seguro de que deseas eliminar a/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('shows Nueva Mascota button', async () => {
    mockGetPets.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })

    renderPage()

    expect(screen.getByText('Nueva Mascota')).toBeInTheDocument()
  })
})
