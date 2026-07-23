import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export default function ModalShell({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass rounded-2xl p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
