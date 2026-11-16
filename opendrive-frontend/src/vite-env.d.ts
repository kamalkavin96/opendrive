import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"SF Pro Display"',
      '"SF Pro Text"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),

    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.8px',
    },

    h2: {
      fontSize: '1.75rem',
      fontWeight: 650,
      letterSpacing: '-0.6px',
    },

    h3: {
      fontSize: '1.5rem',
      fontWeight: 650,
      letterSpacing: '-0.5px',
    },

    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.3px',
    },

    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.2px',
    },

    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.15px',
    },

    subtitle1: {
      fontSize: '0.95rem',
      fontWeight: 600,
    },

    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },

    body1: {
      fontSize: '0.9rem',
      fontWeight: 400,
      letterSpacing: '-0.1px',
      lineHeight: 1.6,
    },

    body2: {
      fontSize: '0.825rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },

    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '-0.1px',
    },

    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.1px',
    },
  },
});

export default theme;