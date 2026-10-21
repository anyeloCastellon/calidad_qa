import React from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App.jsx'
import './styles.css'

const theme = createTheme({
  palette: { primary: { main: '#22625b', dark: '#173f3c' }, secondary: { main: '#836a33' }, background: { default: '#f5f7f7', paper: '#ffffff' }, text: { primary: '#203433', secondary: '#526663' } },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 16, button: { textTransform: 'none', fontWeight: 650 }, h4: { fontWeight: 700, fontSize: '1.9rem' }, h5: { fontWeight: 700, fontSize: '1.35rem' } },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, fontSize: '1rem' } } },
    MuiIconButton: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
    MuiInputBase: { styleOverrides: { root: { fontSize: '1rem', minHeight: 48 } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '1rem' }, shrink: { transform: 'translate(14px, -10px) scale(1)', backgroundColor: '#fff', padding: '0 4px' } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: '1rem', marginLeft: 0, marginRight: 0 } } },
    MuiChip: { styleOverrides: { root: { fontSize: '1rem' } } },
    MuiDialog: { styleOverrides: { paper: { margin: 16, width: 'calc(100% - 32px)' } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: 44, fontSize: '1rem' } } },
  },
})

createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme}><CssBaseline/><App/></ThemeProvider>)
