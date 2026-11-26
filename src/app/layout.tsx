import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Urban Air Quality Assistant',
  description:
    'Explore city air-quality snapshots, station history, statistical outlooks and health guidance. Data refreshed every six hours.',
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/manifest.json`,
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Accessibility: skip link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-slate-950"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
