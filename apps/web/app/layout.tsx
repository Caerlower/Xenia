import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Pixelify_Sans } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { Web3Provider } from '@/components/Web3Provider';
import './globals.css';

const display = Pixelify_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Xenia',
    template: '%s · Xenia',
  },
  description:
    'A stake. An oath. A consequence. Slashable-stake trust for AI agents on Sepolia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <Web3Provider>
          <div className="site-crt-grain" aria-hidden />
          <Nav />
          <main>{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
