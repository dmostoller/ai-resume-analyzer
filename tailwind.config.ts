import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%', backgroundSize: '100% 100%' },
          '50%': { backgroundPosition: '100% 50%', backgroundSize: '200% 200%' },
          '100%': { backgroundPosition: '0% 50%', backgroundSize: '100% 100%' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 5s ease-in-out infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
} satisfies Config;
