import { useState, useRef, useEffect } from 'react'
import { useTimerProfiles } from '../../queries/useTimerProfiles'

interface Props {
  profileId: string
  onSelect: (profileId: string) => void
}

export default function ProfileBadge({ profileId, onSelect }: Props) {
  const { data: profiles = [] } = useTimerProfiles()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const active = profiles.find((p) => p.id === profileId) ?? profiles[0]

  if (!active) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2d0a3f] text-[#d975f7] border border-[#c54af0]/30 hover:border-[#c54af0] transition-colors"
      >
        {active.name}
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 min-w-[120px]">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[#2a2a2a] ${
                p.id === profileId ? 'text-[#d975f7]' : 'text-gray-300'
              }`}
            >
              {p.name}
              {p.id === profileId && <span className="float-right text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
