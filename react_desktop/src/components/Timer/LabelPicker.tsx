import { useState, useRef, useEffect } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { useLabels } from '../../queries/useLabels'
import { useCreateLabel } from '../../mutations/useCreateLabel'
import { LABEL_COLORS } from '../../types/label'

interface Props {
  value: string | null
  onChange: (name: string | null) => void
}

export default function LabelPicker({ value, onChange }: Props) {
  const { data: labels = [] } = useLabels()
  const createLabel = useCreateLabel()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[19])
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selectedLabel = labels.find((l) => l.name === value)

  function handleSelect(name: string) {
    onChange(name)
    setOpen(false)
  }

  function handleCreate() {
    if (!newName.trim()) return
    createLabel.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: (label) => {
          onChange(label.name)
          setCreating(false)
          setNewName('')
          setOpen(false)
        },
      }
    )
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c54af0] transition-colors text-sm"
      >
        {selectedLabel ? (
          <>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedLabel.color }} />
            <span className="text-white font-medium">{selectedLabel.name}</span>
          </>
        ) : (
          <>
            <Tag size={14} className="text-gray-500" />
            <span className="text-gray-400">Select label</span>
          </>
        )}
        <span className="ml-auto text-gray-500 text-xs">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Clear */}
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <X size={13} />
              Clear label
            </button>
          )}

          {/* Label list */}
          {labels.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {labels
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelect(l.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[#2a2a2a] ${
                      l.name === value ? 'text-[#d975f7]' : 'text-gray-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    {l.name}
                    {l.name === value && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
            </div>
          )}

          {/* Create new */}
          {creating ? (
            <div className="border-t border-[#2a2a2a] p-2 space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Label name (e.g. W1M)"
                className="w-full px-2 py-1.5 text-sm bg-[#121212] border border-[#2a2a2a] rounded text-white placeholder-gray-600 focus:outline-none focus:border-[#c54af0]"
              />
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-1 text-xs rounded bg-[#c54af0] text-white hover:bg-[#d975f7]">
                  Create
                </button>
                <button onClick={() => setCreating(false)} className="flex-1 py-1 text-xs rounded bg-[#2a2a2a] text-gray-300 hover:bg-[#333]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-white hover:bg-[#2a2a2a] border-t border-[#2a2a2a] transition-colors"
            >
              <Plus size={13} />
              New label
            </button>
          )}
        </div>
      )}
    </div>
  )
}
