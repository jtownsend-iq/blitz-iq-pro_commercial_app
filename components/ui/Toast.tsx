"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}

type ToastContextValue = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      // Auto-remove after duration
      const duration = toast.duration ?? 5000
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'success' })
    },
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'error', duration: 7000 })
    },
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'info' })
    },
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string) => {
      addToast({ title, description, variant: 'warning' })
    },
    [addToast]
  )

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

const variantConfig: Record<
  ToastVariant,
  { icon: ReactNode; className: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    className: 'border-red-500/30 bg-red-500/10 text-red-100',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    className:
      'border-amber-500/30 bg-amber-500/10 text-amber-100',
  },
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: Toast[]
  onClose: (id: string) => void
}) {
  if (toasts.length === 0) return null

  const container = (
    <div
      className="fixed bottom-0 right-0 z-80 flex flex-col gap-3 p-4 md:max-w-md"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(container, document.body)
    : null
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast
  onClose: (id: string) => void
}) {
  const config = variantConfig[toast.variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-[0_18px_45px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all motion-reduce:transition-none animate-in slide-in-from-right-full ${config.className}`}
    >
      <div className="shrink-0" aria-hidden="true">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs opacity-90">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="shrink-0 rounded-full p-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
