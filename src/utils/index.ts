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