/**
 * Centralized Design System Tokens
 * All design tokens conform to the specified brand requirements:
 * Primary Color: #D45060 (Main brand treatment)
 */

export const tokens = {
  colors: {
    primary: {
      DEFAULT: '#D45060',
      hover: '#BD3E4E',
      active: '#A83342',
      light: '#FDF2F4',
      subtle: '#FCE7EA',
      border: '#F7B5BD',
      text: '#FFFFFF',
    },
    background: {
      app: '#F5F7FB',
      card: '#FFFFFF',
      navbar: '#D45060',
      muted: '#F8FAFC',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      muted: '#94A3B8',
      inverse: '#FFFFFF',
    },
    border: {
      subtle: '#E2E8F0',
      card: '#EAEFF5',
      strong: '#CBD5E1',
    },
    status: {
      success: {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#A7F3D0',
        solid: '#10B981',
      },
      warning: {
        bg: '#FFFBEB',
        text: '#92400E',
        border: '#FDE68A',
        solid: '#F59E0B',
      },
      danger: {
        bg: '#FEF2F2',
        text: '#991B1B',
        border: '#FECACA',
        solid: '#EF4444',
      },
      info: {
        bg: '#EFF6FF',
        text: '#1E40AF',
        border: '#BFDBFE',
        solid: '#3B82F6',
      },
      purple: {
        bg: '#F5F3FF',
        text: '#5B21B6',
        border: '#DDD6FE',
        solid: '#8B5CF6',
      },
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    navbar: '0 2px 8px 0 rgba(212, 80, 96, 0.25)',
  },
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    full: '9999px',
  },
} as const

export default tokens

