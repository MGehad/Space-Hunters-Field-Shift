import './globals.css';
import { inter, cairo } from './fonts';
import { LanguageProvider } from '../context/LanguageContext';
import { WorkingSessionProvider } from '../context/WorkingSessionContext';

export const metadata = {
  title: 'Field Shift — Agricultural Intelligence & Decision Support | Space Hunters',
  description: 'Analyze agricultural conditions, evaluate crop suitability, compare farming scenarios and generate data-driven reports using environmental and Earth observation data.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050c1b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className={`h-full ${inter.variable} ${cairo.variable}`}>
      <body className="h-full overflow-hidden bg-[#050c1b] text-slate-100 selection:bg-cyan-600 selection:text-white">
        <LanguageProvider>
          <WorkingSessionProvider>
            {children}
          </WorkingSessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
