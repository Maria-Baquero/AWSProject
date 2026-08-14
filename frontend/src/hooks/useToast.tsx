import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: Toast[]
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-dismiss after 4 seconds (visible for at least 3 seconds per requirement 4.5)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const showSuccess = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast]
  )

  const showError = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showSuccess, showError }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
