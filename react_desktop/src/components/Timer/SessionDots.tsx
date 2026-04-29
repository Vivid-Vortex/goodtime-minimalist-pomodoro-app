interface Props {
  completed: number
  total?: number      // dots to show (longBreakAfter from profile)
  onReset: () => void
}

export default function SessionDots({ completed, total = 4, onReset }: Props) {
  return (
    <button
      onClick={onReset}
      title="Click to reset session count"
      className="flex items-center gap-1.5 group"
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < completed % total || (completed > 0 && completed % total === 0)
              ? 'bg-[#d975f7]'
              : 'bg-[#2a2a2a]'
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 group-hover:text-gray-300 transition-colors">
        {completed}
      </span>
    </button>
  )
}
