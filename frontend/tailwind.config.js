/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		colors: {
  			// ── Page & surface (light theme — main content area) ──────────
  			page:       '#F4F5F9',
  			surface:    '#FFFFFF',
  			raised:     '#F0F2F7',
  			hover:      '#E8EBF3',
  			selected:   '#E0E4F0',
  			outline:    '#DDE1EF',
  			'outline-strong': '#B8C0D8',

  			// ── Sidebar (dark — this is the ONLY dark element) ───────────
  			sidebar:    '#1E1B4B',
  			'sidebar-hover':   '#2D2A6E',
  			'sidebar-active':  'rgba(255,255,255,0.12)',
  			'sidebar-text':    '#C7C4F0',
  			'sidebar-active-text': '#FFFFFF',

  			// ── Primary action — Indigo ───────────────────────────────────
  			indigo: {
  				DEFAULT:   '#4338CA',
  				hover:     '#3730A3',
  				light:     '#EEF2FF',
  				subtle:    'rgba(67,56,202,0.10)',
  				border:    'rgba(67,56,202,0.25)',
  				text:      '#FFFFFF',
  				muted:     '#6366F1',
  			},

  			// ── Currency amounts (ONLY used for monetary values) ──────────
  			myr:   '#92400E',
  			'myr-bg': '#FFFBEB',
  			usdt:  '#075985',
  			'usdt-bg': '#F0F9FF',
  			php:   '#5B21B6',
  			'php-bg': '#F5F3FF',

  			// ── Semantic status ───────────────────────────────────────────
  			success:   '#059669',
  			'success-bg':    '#ECFDF5',
  			'success-border':'#6EE7B7',

  			warning:   '#D97706',
  			'warning-bg':    '#FFFBEB',
  			'warning-border':'#FCD34D',

  			danger:    '#DC2626',
  			'danger-bg':     '#FEF2F2',
  			'danger-border': '#FCA5A5',

  			processing: '#0284C7',
  			'processing-bg': '#F0F9FF',
  			'processing-border': '#7DD3FC',

  			// ── Text ramp — MAXIMUM CONTRAST on light backgrounds ─────────
  			ink:       '#0F172A',
  			'ink-2':   '#334155',
  			'ink-3':   '#64748B',
  			'ink-4':   '#94A3B8',

  			// ── Shadcn/Radix tokens (keep for compatibility) ──────────────
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			card:  '10px',
  			panel: '14px',
  			input: '7px',
  			badge: '5px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			card:   '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
  			panel:  '0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
  			row:    '0 2px 8px rgba(0,0,0,0.06)',
  			focus:  '0 0 0 3px rgba(67,56,202,0.20)',
  			sidebar:'1px 0 0 rgba(0,0,0,0.12)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};