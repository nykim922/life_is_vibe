import {
  createContext,
  useCallback as _u,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Toast.css'

void _u

interface ToastData {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastApi {
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const timer = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, opts) => {
      clearTimer()
      const id = Date.now()
      setToast({ id, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction })
      timer.current = window.setTimeout(() => setToast(null), opts?.actionLabel ? 4500 : 2200)
    },
    [clearTimer],
  )

  const handleAction = useCallback(() => {
    if (toast?.onAction) toast.onAction()
    clearTimer()
    setToast(null)
  }, [toast, clearTimer])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast__msg">{toast.message}</span>
          {toast.actionLabel && (
            <button className="toast__action" onClick={handleAction}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
