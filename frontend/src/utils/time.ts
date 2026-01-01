/**
 * Formats a timestamp as either relative time (for < 6 hours ago) or absolute time (for >= 6 hours ago).
 * Relative format: "2 minutes ago", "1 hour ago"
 * Absolute format: "11:45am Dec 28, 2025"
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  // Use relative format for times within the last 6 hours
  if (diffHours < 6) {
    if (diffSeconds < 60) {
      return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
    }

    if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    }

    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  // Use absolute format for times >= 6 hours ago
  const date = new Date(timestamp);

  // Format: "11:45am Dec 28, 2025"
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12; // Convert to 12-hour format

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();

  return `${displayHours}:${minutes}${ampm} ${month} ${dayOfMonth}, ${year}`;
}
