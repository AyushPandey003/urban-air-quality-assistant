import Link from 'next/link';

export function Navbar() {
  return (
    <header className="border-b border-white/[0.06] bg-[#0b141b]/85 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-5 sm:px-8"
      >
        <Link href="/" className="flex items-center gap-3">
          <span className="brand-icon" aria-hidden>
            ≋
          </span>
          <span>
            <span className="text-xl font-semibold tracking-tight">
              Air<span className="text-teal-300">space</span>
            </span>
            <span className="mt-0.5 block text-xs uppercase tracking-wider text-slate-400">
              Urban air quality assistant
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="hidden border-b border-teal-300 pb-1 text-xs text-teal-200 sm:block">
            Overview
          </span>
          <a
            href="https://openaq.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center text-xs text-slate-300 transition hover:text-teal-200"
          >
            Data by OpenAQ ↗
          </a>
        </div>
      </nav>
    </header>
  );
}
