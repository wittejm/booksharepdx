/**
 * Formats a timestamp for display.
 * - "just now" if < 1 minute ago
 * - Time only (e.g. "2:30pm") if today
 * - Time + date (e.g. "2:30pm Jan 18") if earlier
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);

  // "just now" for < 1 minute
  if (diffSeconds < 60) {
    return "just now";
  }

  // Format time component
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${minutes}${ampm}`;

  // Check if same calendar day
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return timeStr;
  }

  // Earlier than today: include date
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getMonth()];
  const dayOfMonth = date.getDate();

  // Include year if not current year
  if (date.getFullYear() !== now.getFullYear()) {
    return `${timeStr} ${month} ${dayOfMonth}, ${date.getFullYear()}`;
  }

  return `${timeStr} ${month} ${dayOfMonth}`;
}
