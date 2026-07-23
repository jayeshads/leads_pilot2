import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import ModalShell from './ModalShell'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
  onClose: () => void
}

/** Per the Implementation Plan: "Edit with AI → opens /dashboard/ai-chat with
 * prefilled context 'Edit campaign: {name}'". This confirms the intent, then
 * hands off to the AI Manager chat rather than editing anything itself. */
export default function EditWithAIModal({ campaign, onClose }: Props) {
  const navigate = useNavigate()

  const handleConfirm = () => {
    const prefill = `Edit campaign: ${campaign.name}`
    navigate(`/dashboard?campaignId=${campaign.id}&prefill=${encodeURIComponent(prefill)}`)
    onClose()
  }

  return (
    <ModalShell title="Edit with AI" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 bg-brand-600/10 border border-brand-500/20 rounded-xl p-4">
          <Sparkles size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">
            This opens a chat with the AI Manager, pre-filled with
            <span className="text-white font-medium"> "Edit campaign: {campaign.name}"</span>.
            You'll describe what to change and the AI will draft the update for approval.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-white/10 hover:border-white/20 text-slate-300 text-sm font-medium py-3 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium py-3 rounded-xl transition-all"
          >
            Open AI chat →
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
