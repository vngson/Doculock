export function formatTimestamp(ts: string | number | undefined | null): string {
  if (ts == null) return 'N/A';
  let ms: number;
  if (typeof ts === 'string') {
    const parsed = parseInt(ts, 10);
    ms = isNaN(parsed) ? Date.parse(ts) : (parsed > 1e12 ? parsed : parsed * 1000);
  } else {
    ms = ts > 1e12 ? ts : ts * 1000;
  }
  const date = new Date(ms);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(ts: string | number | undefined | null): string {
  if (ts == null) return '';
  let ms: number;
  if (typeof ts === 'string') {
    const parsed = parseInt(ts, 10);
    ms = isNaN(parsed) ? Date.parse(ts) : (parsed > 1e12 ? parsed : parsed * 1000);
  } else {
    ms = ts > 1e12 ? ts : ts * 1000;
  }
  const diff = Date.now() - ms;
  if (diff < 0) return 'vừa xong';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}
