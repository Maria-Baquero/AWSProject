import { useToast } from '../hooks/useToast'

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600'
              : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
