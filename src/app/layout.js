import './globals.css';

export const metadata = {
  title: 'AguaControl - Gestión de Sodería',
  description: 'Sistema de gestión para soderías argentinas',
  manifest: '/manifest.json',
  themeColor: '#0284c7',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
