interface Props {
  size?: number
  strokeWidth?: number
  progress: number   // 0–1, 1 = full ring
  color?: string
  trackColor?: string
}

export default function CircularProgress({
  size = 260,
  strokeWidth = 10,
  progress,
  color = '#d975f7',
  trackColor = '#2a2a2a',
}: Props) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)))
  const cx = size / 2

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  )
}
