import '@/styles/globals.css'
import {createTheme, CssBaseline, ThemeProvider} from '@mui/material';
export default function App({ Component, pageProps }) {
  const theme = createTheme({
      palette: {
          mode: 'dark',
      },
  });

  return (<ThemeProvider theme={theme}>
          <CssBaseline/>
          <Component {...pageProps} />
  </ThemeProvider>)
}
