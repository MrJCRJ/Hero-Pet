// pages/_app.js
import "./globals.css"; // caminho relativo conforme sua estrutura

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
