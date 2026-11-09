/** Inline SVG icons (24x24, stroke based) so the card works without extra icon sets. */
const P: Record<string, string> = {
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 10v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M7 5v14l12-7Z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 18v.5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  cross: '<path d="m6 6 12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21Z"/><circle cx="12" cy="9.500" r="2.500"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.500-6.500 8-6.500s8 2.500 8 6.500"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  door: '<path d="M6 21V4h10v17M4 21h16"/><circle cx="13.500" cy="12.500" r=".6"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.500-5.800M20 4v5h-5"/>',
  building: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
};

export function icon(name: string, size = 18): string {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ""}</svg>`;
}
