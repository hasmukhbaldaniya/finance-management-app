// Indian Rupee formatting — confirmed by 019-trip-listing.md's reference
// screenshot: Indian digit grouping (₹1,50,000.00, not ₹150,000.00), not a
// generic Intl.NumberFormat("en-US") pattern.
export function formatInr(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// 020-trip-details.md's own date/time format for the Trip Overview panel —
// deliberately different from formatDateTime above, since the reference
// screenshots use two different formats across the listing vs. this page
// (reproduced faithfully rather than unified — see that story's Open
// Questions).
export function formatTripOverviewDateTime(value: string | Date): string {
  const formatted = new Date(value).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  return formatted.replace(",", " at");
}

export function formatTripOverviewDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ISO string → the local-time value an <input type="datetime-local"> expects
// ("YYYY-MM-DDTHH:mm") — used to pre-fill 021's Edit Trip form from a trip's
// saved startAt/endAt. Built from the Date object's local getters (not a
// slice of the ISO string itself), so it reflects the browser's local time
// the same way the input's own value always does.
export function toDatetimeLocalValue(value: string): string {
  const date = new Date(value);
  const pad = (num: number): string => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A trip-linked claim has no Claim Name of its own — the trip's own name
// stands in for it (022's own Open Question, resolved this way).
export function formatClaimName(claim: { name: string | null; tripName: string | null }): string {
  return claim.name ?? claim.tripName ?? "Untitled Claim";
}

// ISO alpha-2 country code → flag emoji, via Unicode regional indicator
// symbols (each letter maps to U+1F1E6 + offset from 'A'). Standard,
// widely-used technique — no external flag-icon library needed since every
// modern OS font renders these natively.
export function countryCodeToFlagEmoji(code: string): string {
  if (code.length !== 2) return "";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + (char.charCodeAt(0) - "A".charCodeAt(0)));
  return String.fromCodePoint(...codePoints);
}
