import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppointmentsPage } from '../AppointmentsPage'
import { ToastProvider } from '../../hooks/useToast'

// Mock services
vi.mock('../../services/appointmentService', () => ({
  getAppointmentsByDate: vi.fn(),
  cancelAppointment: vi.fn(),
  completeAppointment: vi.fn(),
  createAppointment: vi.fn(),
}))

// Mock AppointmentForm to avoid complexity
vi.mock('../../components/AppointmentForm', () => ({
  AppointmentForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="appointment-form">
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}))

import { getAppointmentsByDate } from '../../services/appointmentService'

const mockGetAppointmentsByDate = vi.mocked(getAppointmentsByDate)

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
          <AppointmentsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no appointments exist for the date', async () => {
    mockGetAppointmentsByDate.mockResolvedValue([])

    renderPage()

    expect(
      await screen.findByText('No hay citas programadas para esta fecha.')
    ).toBeInTheDocument()
    expect(screen.getByText('Crear primera cita')).toBeInTheDocument()
  })

  it('renders appointments with correct data', async () => {
    mockGetAppointmentsByDate.mockResolvedValue([
      {
        id: '1',
        petId: 'p1',
        petName: 'Firulais',
        clientName: 'Juan Pérez',
        date: '2024-06-15',
        startTime: '09:00:00',
        durationMinutes: 30,
        reason: 'Vacunación',
        status: 'scheduled',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
      {
        id: '2',
        petId: 'p2',
        petName: 'Michi',
        clientName: 'María García',
        date: '2024-06-15',
        startTime: '10:30:00',
        durationMinutes: 45,
        reason: 'Control general',
        status: 'completed',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
    ])

    renderPage()

    expect(await screen.findByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('10:30')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('Vacunación')).toBeInTheDocument()
    expect(screen.getByText('Control general')).toBeInTheDocument()
    expect(screen.getByText('Programada')).toBeInTheDocument()
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })

  it('shows cancel and complete buttons only for scheduled appointments', async () => {
    mockGetAppointmentsByDate.mockResolvedValue([
      {
        id: '1',
        petId: 'p1',
        petName: 'Firulais',
        clientName: 'Juan',
        date: '2024-06-15',
        startTime: '09:00:00',
        durationMinutes: 30,
        reason: 'Vacunación',
        status: 'scheduled',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
      {
        id: '2',
        petId: 'p2',
        petName: 'Michi',
        clientName: 'María',
        date: '2024-06-15',
        startTime: '10:30:00',
        durationMinutes: 45,
        reason: 'Control',
        status: 'completed',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
    ])

    renderPage()

    await screen.findByText('09:00')

    // Only one set of action buttons (for the scheduled appointment)
    const cancelButtons = screen.getAllByText('Cancelar')
    const completeButtons = screen.getAllByText('Completar')
    expect(cancelButtons).toHaveLength(1)
    expect(completeButtons).toHaveLength(1)
  })

  it('shows confirmation dialog when clicking cancel', async () => {
    const user = userEvent.setup()
    mockGetAppointmentsByDate.mockResolvedValue([
      {
        id: '1',
        petId: 'p1',
        petName: 'Firulais',
        clientName: 'Juan',
        date: '2024-06-15',
        startTime: '09:00:00',
        durationMinutes: 30,
        reason: 'Vacunación',
        status: 'scheduled',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
    ])

    renderPage()

    await screen.findByText('09:00')
    await user.click(screen.getByText('Cancelar'))

    expect(screen.getByText('¿Cancelar esta cita?')).toBeInTheDocument()
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('Volver')).toBeInTheDocument()
  })

  it('shows confirmation dialog when clicking complete', async () => {
    const user = userEvent.setup()
    mockGetAppointmentsByDate.mockResolvedValue([
      {
        id: '1',
        petId: 'p1',
        petName: 'Firulais',
        clientName: 'Juan',
        date: '2024-06-15',
        startTime: '09:00:00',
        durationMinutes: 30,
        reason: 'Vacunación',
        status: 'scheduled',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
    ])

    renderPage()

    await screen.findByText('09:00')
    await user.click(screen.getByText('Completar'))

    expect(screen.getByText('¿Marcar cita como completada?')).toBeInTheDocument()
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
  })

  it('shows Nueva Cita button', async () => {
    mockGetAppointmentsByDate.mockResolvedValue([])

    renderPage()

    expect(screen.getByText('Nueva Cita')).toBeInTheDocument()
  })

  it('shows date selector', async () => {
    mockGetAppointmentsByDate.mockResolvedValue([])

    renderPage()

    expect(screen.getByLabelText('Fecha')).toBeInTheDocument()
  })
})
