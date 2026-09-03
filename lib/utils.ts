import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(
  min: number | null,
  max: number | null,
  isMarketRelated: boolean
): string {
  if (isMarketRelated || (!min && !max)) return "Market related";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(n);
  if (min && max) return `R${fmt(min)} – R${fmt(max)} / month`;
  if (min) return `From R${fmt(min)} / month`;
  if (max) return `Up to R${fmt(max)} / month`;
  return "Market related";
}

export function daysLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Expired";
  if (diff === 0) return "Last day";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
