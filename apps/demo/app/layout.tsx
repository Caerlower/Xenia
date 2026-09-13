import type { Metadata } from 'next';
import { DM_Sans, Pixelify_Sans } from 'next/font/google';
import './globals.css';

const pixel = Pixelify_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

const sans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Xenia Demo',
    template: '%s · Xenia Demo',
  },
  description:
    'Live Sepolia demo of slashable-stake trust for AI agents. Run Agents A, B, and C on-chain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${sans.variable}`}>
      <body>
        <div className="site-crt-grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
