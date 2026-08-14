import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'

// Mock the api module
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

function TestConsumer() {
  const { user, token, loading, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.fullName : 'null'}</span>
      <span data-testid="token">{token || 'null'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    )
    spy.mockRestore()
  })

  it('initializes with no user when localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(screen.getByTestId('token').textContent).toBe('null')
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('loads user and token from localStorage on mount', () => {
    const mockUser = { id: '1', fullName: 'Dr. García', email: 'garcia@vet.com', role: 'veterinarian' }
    localStorage.setItem('token', 'test-jwt-token')
    localStorage.setItem('user', JSON.stringify(mockUser))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('Dr. García')
    expect(screen.getByTestId('token').textContent).toBe('test-jwt-token')
  })

  it('clears localStorage on invalid stored user JSON', () => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', 'invalid-json')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('logout clears user state and localStorage', async () => {
    const mockUser = { id: '1', fullName: 'Dr. García', email: 'garcia@vet.com', role: 'veterinarian' }
    localStorage.setItem('token', 'test-jwt-token')
    localStorage.setItem('user', JSON.stringify(mockUser))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('Dr. García')

    await act(async () => {
      screen.getByText('Logout').click()
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(screen.getByTestId('token').textContent).toBe('null')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('login stores token and user in state and localStorage', async () => {
    const { default: api } = await import('../services/api')
    const mockUser = { id: '2', fullName: 'Recepcionista Ana', email: 'ana@vet.com', role: 'receptionist' }
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { token: 'new-jwt', user: mockUser },
    })

    function LoginConsumer() {
      const { user, token, login } = useAuth()
      return (
        <div>
          <span data-testid="user">{user ? user.fullName : 'null'}</span>
          <span data-testid="token">{token || 'null'}</span>
          <button onClick={() => login('ana@vet.com', 'password123')}>Login</button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Login').click()
    })

    expect(screen.getByTestId('user').textContent).toBe('Recepcionista Ana')
    expect(screen.getByTestId('token').textContent).toBe('new-jwt')
    expect(localStorage.getItem('token')).toBe('new-jwt')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser)
  })
})
