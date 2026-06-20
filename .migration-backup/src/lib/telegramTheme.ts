/**
 * Telegram Theme Integration
 * Converts Telegram hex themeParams to HSL and maps them to app design tokens.
 */

function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getRelativeLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastForeground(bgHex: string): string {
  return getRelativeLuminance(bgHex) > 0.5 ? '0 0% 0%' : '0 0% 100%';
}

function darken(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  section_separator_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

/**
 * Apply Telegram theme colors to app CSS variables.
 * This makes the entire app adopt Telegram's native look.
 */
export function applyTelegramTheme(tp: TelegramThemeParams, colorScheme: 'light' | 'dark') {
  const root = document.documentElement;
  const isDark = colorScheme === 'dark';

  // Primary = Telegram's button color (the accent/action color)
  if (tp.button_color) {
    root.style.setProperty('--primary', hexToHSL(tp.button_color));
    root.style.setProperty('--ring', hexToHSL(tp.button_color));
    root.style.setProperty('--sidebar-primary', hexToHSL(tp.button_color));
    root.style.setProperty('--sidebar-ring', hexToHSL(tp.button_color));
    root.style.setProperty('--accent', hexToHSL(tp.button_color));
    root.style.setProperty('--sidebar-accent', hexToHSL(tp.button_color));
  }

  if (tp.button_text_color) {
    root.style.setProperty('--primary-foreground', hexToHSL(tp.button_text_color));
    root.style.setProperty('--sidebar-primary-foreground', hexToHSL(tp.button_text_color));
    root.style.setProperty('--accent-foreground', hexToHSL(tp.button_text_color));
    root.style.setProperty('--sidebar-accent-foreground', hexToHSL(tp.button_text_color));
  }

  // Background = Telegram bg_color
  if (tp.bg_color) {
    root.style.setProperty('--background', hexToHSL(tp.bg_color));
    root.style.setProperty('--sidebar-background', hexToHSL(tp.bg_color));
  }

  // Foreground = Telegram text_color
  if (tp.text_color) {
    root.style.setProperty('--foreground', hexToHSL(tp.text_color));
    root.style.setProperty('--card-foreground', hexToHSL(tp.text_color));
    root.style.setProperty('--popover-foreground', hexToHSL(tp.text_color));
    root.style.setProperty('--sidebar-foreground', hexToHSL(tp.text_color));
  }

  // Card/Popover = section_bg_color or bg_color
  const cardColor = tp.section_bg_color || tp.bg_color;
  if (cardColor) {
    root.style.setProperty('--card', hexToHSL(cardColor));
    root.style.setProperty('--popover', hexToHSL(cardColor));
  }

  // Secondary/Muted = secondary_bg_color
  if (tp.secondary_bg_color) {
    root.style.setProperty('--secondary', hexToHSL(tp.secondary_bg_color));
    root.style.setProperty('--muted', hexToHSL(tp.secondary_bg_color));
  }

  // Muted foreground = hint_color (subtitle text)
  const hintColor = tp.hint_color || tp.subtitle_text_color;
  if (hintColor) {
    root.style.setProperty('--muted-foreground', hexToHSL(hintColor));
    root.style.setProperty('--secondary-foreground', hexToHSL(hintColor));
  }

  // Border/Input = section_separator_color or derived
  if (tp.section_separator_color) {
    root.style.setProperty('--border', hexToHSL(tp.section_separator_color));
    root.style.setProperty('--input', hexToHSL(tp.section_separator_color));
    root.style.setProperty('--sidebar-border', hexToHSL(tp.section_separator_color));
  } else if (tp.secondary_bg_color) {
    // Derive border from secondary bg
    const borderHex = isDark ? lighten(tp.secondary_bg_color, 20) : darken(tp.secondary_bg_color, 15);
    root.style.setProperty('--border', hexToHSL(borderHex));
    root.style.setProperty('--input', hexToHSL(borderHex));
    root.style.setProperty('--sidebar-border', hexToHSL(borderHex));
  }

  // Destructive = Telegram destructive_text_color
  if (tp.destructive_text_color) {
    root.style.setProperty('--destructive', hexToHSL(tp.destructive_text_color));
    root.style.setProperty('--destructive-foreground', '0 0% 100%');
  }

  // Link color for accent text
  if (tp.link_color || tp.accent_text_color) {
    // We keep primary as button_color, link_color can be used for specific link styling
    const linkHex = tp.link_color || tp.accent_text_color!;
    root.style.setProperty('--tg-link-color', linkHex);
  }

  console.log('[Telegram] Theme applied:', colorScheme, tp);
}

/**
 * Early theme application (called from inline script before React).
 * Uses raw hex setting on CSS vars.
 */
export function applyTelegramThemeEarly(tp: TelegramThemeParams, colorScheme: 'light' | 'dark') {
  applyTelegramTheme(tp, colorScheme);
}
