import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { useLabels } from '../queries/useLabels'
import { useSessions } from '../queries/useSessions'
import { useCreateLabel } from '../mutations/useCreateLabel'
import { saveLabels } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import { LABEL_COLORS } from '../types/label'
import LabelRow from '../components/Labels/LabelRow'
import ColorPicker from '../components/Labels/ColorPicker'

export default function LabelsPage() {
  const qc = useQueryClient()
  const { data: labels = [] } = useLabels()
  const { data: sessions = [] } = useSessions()
  const createLabel = useCreateLabel()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[19])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sorted = [...labels].sort((a, b) => a.order - b.order)

  // Count sessions per label
  const sessionCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.labelName] = (acc[s.labelName] ?? 0) + 1
    return acc
  }, {})

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((l) => l.id === active.id)
    const newIdx = sorted.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(sorted, oldIdx, newIdx).map((l, i) => ({ ...l, order: i }))
    saveLabels(reordered)
    qc.invalidateQueries({ queryKey: queryKeys.labels.all })
  }

  function handleCreate() {
    if (!newName.trim()) return
    createLabel.mutate({ name: newName.trim(), color: newColor }, {
      onSuccess: () => {
        setNewName('')
        setNewColor(LABEL_COLORS[19])
        setCreating(false)
      },
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#2a2a2a] shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Labels</h1>
          <p className="text-xs text-gray-500 mt-0.5">{labels.length} label{labels.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#c54af0] text-white hover:bg-[#d975f7] transition-colors"
        >
          <Plus size={15} />
          New Label
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {/* Inline create form */}
        {creating && (
          <div className="bg-[#1a1a1a] border border-[#c54af0]/40 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: newColor }} />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Label name (e.g. W1M, ESS)"
                className="flex-1 px-2 py-1 text-sm bg-[#121212] border border-[#2a2a2a] rounded text-white placeholder-gray-600 focus:outline-none focus:border-[#c54af0]"
              />
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#c54af0] text-white hover:bg-[#d975f7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName('') }}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sortable list */}
        {sorted.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 space-y-2">
            <p className="text-sm">No labels yet</p>
            <p className="text-xs">Create one to start tracking time by tag</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {sorted.map((label) => (
                <LabelRow key={label.id} label={label} sessionCount={sessionCounts[label.name] ?? 0} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
