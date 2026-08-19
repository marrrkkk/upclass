const PRESENCE_COLORS = [
  "#0369a1",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#ca8a04",
] as const

export function getPresenceColor(userId: string) {
  let hash = 0

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index)
    hash |= 0
  }

  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
