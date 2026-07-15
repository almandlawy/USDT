/** Format unread notification badge for UI. Hides at zero; caps at 99+. */
export function formatUnreadBadge(count: number | null | undefined): string | null {
  if (count == null || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
