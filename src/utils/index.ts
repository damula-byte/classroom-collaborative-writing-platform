const CHARS = 'ADEFGHJKMNPQRTUVWXY234679'; // Excludes: 0,O,1,I,L,Z,S,5,B,8,C

export function generateClassCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function cn(...classes: (string | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sanitizeHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function normalizeClassCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function cleanDisplayName(name: string, max = 60): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, max);
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return html
    .slice(0, 100_000)
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
}

export function clampVotesPerStudent(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(20, Math.floor(value)));
}

export function clampMaxMembers(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.max(1, Math.min(20, Math.floor(value)));
}

export function calculateWinners<T extends { id: string; status: string }>(
  groups: T[],
  voteCountByGroupId: Record<string, number>
): { maxVotes: number; winnerIds: Set<string> } {
  const eligible = groups.filter(
    (g) => g.status === 'SUBMITTED' || g.status === 'REVIEWING' || g.status === 'REVIEWED'
  );
  let maxVotes = 0;
  for (const g of eligible) {
    const count = voteCountByGroupId[g.id] ?? 0;
    if (count > maxVotes) maxVotes = count;
  }
  const winnerIds = new Set<string>();
  if (maxVotes > 0) {
    for (const g of eligible) {
      if ((voteCountByGroupId[g.id] ?? 0) === maxVotes) {
        winnerIds.add(g.id);
      }
    }
  }
  return { maxVotes, winnerIds };
}