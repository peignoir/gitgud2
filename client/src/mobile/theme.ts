/**
 * Design tokens for the 7-screen wizard flow.
 * Matches the Expo handoff spec but targets React web.
 */

export const theme = {
  colors: {
    primary: '#007AFF',           // iOS blue for CTAs
    primaryDisabled: '#A0CFFF',   // Disabled button state
    background: '#F2F2F7',        // Light gray app background
    surface: '#FFFFFF',           // Card/elevated surfaces
    text: '#1C1C1E',              // Primary text
    textSecondary: '#8E8E93',     // Muted text
    border: '#C6C6C8',            // Input borders
    error: '#FF3B30',             // Error states
    success: '#34C759',           // Success states
    userBubble: '#007AFF',        // Chat user message
    assistantBubble: '#E9E9EB',   // Chat assistant message
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 17,
    lg: 22,
    xl: 28,
    xxl: 34,
  },
  shadow: {
    small: '0 1px 3px rgba(0,0,0,0.08)',
    medium: '0 4px 12px rgba(0,0,0,0.12)',
  },
} as const;

export type Theme = typeof theme;

