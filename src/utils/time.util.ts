export const TimePatterns = {
  DATE_TIME: "dd/MM/yyyy HH:mm:ss",
  DATE: "dd/MM/yyyy",
  TIME: "HH:mm:ss",
} as const;

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

export const formatTime = (dateString: string, pattern: string): string => {
  const date = new Date(dateString);

  const map: Record<string, string> = {
    dd: String(date.getDate()).padStart(2, "0"),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    yyyy: String(date.getFullYear()),
    HH: String(date.getHours()).padStart(2, "0"),
    mm: String(date.getMinutes()).padStart(2, "0"),
    ss: String(date.getSeconds()).padStart(2, "0"),
  };

  let formatted = pattern;
  Object.keys(map).forEach((key) => {
    formatted = formatted.replace(key, map[key]);
  });

  return formatted;
};