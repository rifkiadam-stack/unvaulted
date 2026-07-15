export type ThemeMode = 'dark' | 'light';

export function initialMode(stored: string | null): ThemeMode {
  return stored === 'light' ? 'light' : 'dark';
}

export function nextMode(m: ThemeMode): ThemeMode {
  return m === 'dark' ? 'light' : 'dark';
}
