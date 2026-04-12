import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <header className="py-6 px-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-900 hover:text-[#6C5CE7] transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#6C5CE7" fillOpacity="0.1" stroke="#6C5CE7" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-base font-semibold">Штрафометр</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  );
}
