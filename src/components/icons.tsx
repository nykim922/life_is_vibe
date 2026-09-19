// 일관된 선 아이콘 세트 (SVG stroke). 이모지 미사용.
interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function GridIcon({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function BookmarkIcon({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function BookmarkFillIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function CalendarIcon({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function UserIcon({ size = 22, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function ClockIcon({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function MapPinIcon({ size = 16, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function CheckIcon({ size = 18, strokeWidth = 2.4, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  )
}

export function CloseIcon({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function EditIcon({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M4 20h4L18 10l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

export function LinkIcon({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  )
}

export function PlusIcon({ size = 18, strokeWidth = 2.2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TrashIcon({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}

export function DotsIcon({ size = 20, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  )
}

export function AlertIcon({ size = 18, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  )
}
