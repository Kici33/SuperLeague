import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Deep background layers
        void:    '#06090F',
        abyss:   '#080C14',
        dark:    '#0D1221',
        surface: '#111827',
        raised:  '#161D2C',
        overlay: '#1C2438',
        muted:   '#232B3E',

        // Gold palette
        gold: {
          dim:    '#5C4A1E',
          DEFAULT:'#C89B3C',
          bright: '#D4AA50',
          light:  '#E8C96A',
          glow:   '#F0E6D2',
        },

        // Hextech blue
        hextech: {
          dim:    '#0A3040',
          DEFAULT:'#0BC4E3',
          bright: '#00D4FF',
          glow:   '#B0F0FF',
        },

        // Text
        ink: {
          ghost:   '#3A4560',
          muted:   '#5A688A',
          dim:     '#8892AA',
          DEFAULT: '#C8D0E0',
          bright:  '#E8ECF4',
          white:   '#F4F6FA',
        },

        // Status
        emerald: '#10D48A',
        ruby:    '#E84057',
        amber:   '#F0B232',
      },

      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
        '2xl': '24px',
      },

      boxShadow: {
        'inner-dark': 'inset 0 1px 0 rgba(255,255,255,0.04)',
        'gold-sm':    '0 0 12px rgba(200,155,60,0.15)',
        'gold':       '0 0 24px rgba(200,155,60,0.2), 0 0 48px rgba(200,155,60,0.08)',
        'gold-lg':    '0 0 40px rgba(200,155,60,0.3), 0 8px 32px rgba(0,0,0,0.4)',
        'hextech':    '0 0 24px rgba(11,196,227,0.2)',
        'card':       '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.3)',
        'float':      '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        'glow-emerald':'0 0 16px rgba(16,212,138,0.25)',
        'glow-ruby':  '0 0 16px rgba(232,64,87,0.25)',
      },

      backgroundImage: {
        'gold-gradient':    'linear-gradient(135deg, #785A28, #C89B3C, #E8C96A)',
        'gold-subtle':      'linear-gradient(135deg, rgba(120,90,40,0.15), rgba(200,155,60,0.08))',
        'hextech-gradient': 'linear-gradient(135deg, #0A3040, #0BC4E3)',
        'dark-gradient':    'linear-gradient(180deg, #111827 0%, #0D1221 100%)',
        'surface-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'card-gradient':    'linear-gradient(145deg, #171F32 0%, #111827 100%)',
        'glow-gold':        'radial-gradient(circle at 50% 0%, rgba(200,155,60,0.12) 0%, transparent 70%)',
      },

      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        'slide-in':    'slideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':    'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'pulse-gold':  'pulseGold 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.8s ease-in-out infinite',
      },

      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:   { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 8px rgba(200,155,60,0.2)' }, '50%': { boxShadow: '0 0 20px rgba(200,155,60,0.4)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
