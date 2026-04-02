/**
 * Shared formatting utilities for ruck stats and timestamps.
 * Single canonical source — imported by all screen files.
 */

/**
 * Format a duration given in total seconds.
 * Returns "1h 23m" for durations >= 1 hour, or "45m 12s" for durations < 1 hour.
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (s > 0) return `${m}m ${s}s`;
  return `${m}m`;
}

/**
 * Format a pace given distance in "cents" (distance / 100 = miles) and duration in seconds.
 * Returns a "MM:SS" pace string (minutes per mile), or '--' if inputs are invalid.
 */
export function formatPace(distanceCents: number, durationSeconds: number): string {
  const miles = distanceCents / 100;
  if (miles <= 0 || durationSeconds <= 0) return '--';
  const paceMinutes = durationSeconds / 60 / miles;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format a date/string as a human-readable relative time label.
 * Returns "just now" for < 1 minute, "Xm ago" for < 1 hour, "Xh ago" for < 1 day,
 * "Xd ago" for < 1 week, and "Xw ago" for older dates.
 */
export function timeAgo(dateStr: Date | string): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}
