import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastContainer } from '../Toast'
import { ToastProvider, useToast } from '../../hooks/useToast'

// Helper component that triggers a toast
function ToastTrigger({ type, message }: { type: 'success' | 'error'; message: string }) {
  const { showSuccess, showError } = useToast()
  return (
    <button
      onClick={() => (type === 'success' ? showSuccess(message) : showError(message))}
    >
      Trigger
    </button>
  )
}

function renderWithProvider(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  )
}

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when there are no toasts', () => {
    const { container } = renderWithProvider(<div />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-live]')).not.toBeInTheDocument()
  })

  it('displays a success toast when triggered', async () => {
    renderWithProvider(<ToastTrigger type="success" message="Cliente creado exitosamente" />)

    await act(async () => {
      screen.getByText('Trigger').click()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Cliente creado exitosamente')
  })

  it('displays an error toast when triggered', async () => {
    renderWithProvider(<ToastTrigger type="error" message="Error al guardar" />)

    await act(async () => {
      screen.getByText('Trigger').click()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar')
  })

  it('toast remains visible for at least 3 seconds (uses 4000ms timeout)', async () => {
    renderWithProvider(<ToastTrigger type="success" message="Operación exitosa" />)

    await act(async () => {
      screen.getByText('Trigger').click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Advance 3 seconds — toast must still be visible
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Advance to 4 seconds — toast should be dismissed
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('toast auto-dismisses after 4000ms', async () => {
    renderWithProvider(<ToastTrigger type="success" message="Auto dismiss" />)

    await act(async () => {
      screen.getByText('Trigger').click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can show multiple toasts simultaneously', async () => {
    function MultiTrigger() {
      const { showSuccess, showError } = useToast()
      return (
        <>
          <button onClick={() => showSuccess('Toast 1')}>T1</button>
          <button onClick={() => showError('Toast 2')}>T2</button>
        </>
      )
    }

    renderWithProvider(<MultiTrigger />)

    await act(async () => {
      screen.getByText('T1').click()
      screen.getByText('T2').click()
    })

    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
    expect(alerts[0]).toHaveTextContent('Toast 1')
    expect(alerts[1]).toHaveTextContent('Toast 2')
  })
})
