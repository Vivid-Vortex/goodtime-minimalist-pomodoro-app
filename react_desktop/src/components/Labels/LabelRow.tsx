import { useState } from 'react'
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ColorPicker from './ColorPicker'
import { useUpdateLabel } from '../../mutations/useUpdateLabel'
import { useDeleteLabel } from '../../mutations/useDeleteLabel'
import type { Label } from '../../types/label'

interface Props {
  label: Label
  sessionCount: number
}

export default function LabelRow({ label, sessionCount }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: label.id })
  const updateLabel = useUpdateLabel()
  const deleteLabel = useDeleteLabel()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [name, setName] = useState(label.name)
  const [color, setColor] = useState(label.color)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function handleSave() {
    if (!name.trim()) return
    updateLabel.mutate({ id: label.id, patch: { name: name.trim(), color } })
    setEditing(false)
  }

  function handleDiscard() {
    setName(label.name)
    setColor(label.color)
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      {editing ? (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleDiscard() }}
              className="flex-1 px-2 py-1 text-sm bg-[#121212] border border-[#2a2a2a] rounded text-white placeholder-gray-600 focus:outline-none focus:border-[#c54af0]"
            />
            <button onClick={handleSave} className="p-1.5 rounded bg-[#c54af0] text-white hover:bg-[#d975f7]">
              <Check size={14} />
            </button>
            <button onClick={handleDiscard} className="p-1.5 rounded bg-[#2a2a2a] text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      ) : confirming ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm text-gray-300">Delete <strong>{label.name}</strong>?</span>
          <button
            onClick={() => deleteLabel.mutate(label.id)}
            className="px-3 py-1 text-xs rounded bg-red-600/80 text-white hover:bg-red-500"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1 text-xs rounded bg-[#2a2a2a] text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-3">
          <button {...attributes} {...listeners} className="text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </button>
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
          <span className="flex-1 text-sm text-white font-medium">{label.name}</span>
          {sessionCount > 0 && (
            <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded-full">
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setEditing(true)} className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirming(true)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
