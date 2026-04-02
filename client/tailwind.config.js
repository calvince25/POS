/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2271b1',
          dark: '#135e96',
        },
        secondary: '#646970',
        accent: '#72aee6',
        wp: {
          body: '#f0f0f1',
          sidebar: '#1d2327',
          border: '#dcdcde',
          text: '#3c434a',
        },
        dark: {
          bg: '#1d2327',
          card: '#2c3338',
          muted: '#3c434a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Open Sans"', '"Helvetica Neue"', 'sans-serif'],
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '3px',
      },
    },
  },
  plugins: [],
}
