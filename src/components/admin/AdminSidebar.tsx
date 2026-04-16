'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  icon: string;
  label: string;
  items: NavItem[];
}

// ─── Navigation config ───────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    icon: '\u{1F4CA}',
    label: 'Аналитика',
    items: [
      { href: '/admin/analytics/funnel', label: 'Воронка' },
      { href: '/admin/analytics/kpi', label: 'KPI' },
    ],
  },
  {
    icon: '\u{1F4B0}',
    label: 'Финансы',
    items: [
      { href: '/admin/finance', label: 'Обзор' },
      { href: '/admin/finance/products', label: 'По продуктам' },
      { href: '/admin/finance/bank', label: 'Выписки' },
    ],
  },
  {
    icon: '\u{1F4E2}',
    label: 'Реклама',
    items: [
      { href: '/admin/ads', label: 'Каналы' },
      { href: '/admin/ads/decisions', label: 'Журнал решений' },
      { href: '/admin/ads/budgets', label: 'Бюджеты' },
      { href: '/admin/ads/alerts', label: 'Алерты' },
    ],
  },
  {
    icon: '\u{1F52C}',
    label: 'Оптимизация',
    items: [
      { href: '/admin/optimization', label: 'Рекомендации' },
      { href: '/admin/optimization/ab', label: 'A/B тесты' },
    ],
  },
];

const NAV_STANDALONE: NavItem = {
  href: '/admin/ai-consultant',
  label: '\u{1F916} AI-консультант',
};

const NAV_MANAGEMENT: NavSection = {
  icon: '\u2699\uFE0F',
  label: 'Управление',
  items: [
    { href: '/admin/orders', label: 'Заявки' },
    { href: '/admin/checks', label: 'Проверки' },
    { href: '/admin/users', label: 'Домены' },
  ],
};

// ─── Component ───────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // All sections expanded by default
  const allSectionLabels = [...NAV_SECTIONS, NAV_MANAGEMENT].map((s) => s.label);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(allSectionLabels));

  function toggleSection(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function isActive(href: string): boolean {
    return pathname === href;
  }

  function isSectionActive(section: NavSection): boolean {
    return section.items.some((item) => pathname === item.href);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  // ─── Sidebar content (shared between mobile overlay and desktop) ──

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-gray-200">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#6C5CE7" />
          <path d="M16 6L22 9.5V16.5L16 20L10 16.5V9.5L16 6Z" fill="white" fillOpacity="0.9" />
          <path d="M13 14L15 16.5L19.5 11.5" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 19L16 22.5L22 19" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 22L16 25.5L22 22" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-bold text-gray-900 text-lg">Штрафометр</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {/* Main sections */}
        {NAV_SECTIONS.map((section) => (
          <SidebarSection
            key={section.label}
            section={section}
            expanded={expanded.has(section.label)}
            onToggle={() => toggleSection(section.label)}
            isActive={isActive}
            isSectionActive={isSectionActive(section)}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}

        {/* AI-consultant standalone */}
        <a
          href={NAV_STANDALONE.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
            isActive(NAV_STANDALONE.href)
              ? 'bg-primary/10 text-primary font-medium border-l-3 border-primary'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {NAV_STANDALONE.label}
        </a>

        {/* Separator */}
        <div className="my-3 border-t border-gray-200" />

        {/* Management section */}
        <SidebarSection
          section={NAV_MANAGEMENT}
          expanded={expanded.has(NAV_MANAGEMENT.label)}
          onToggle={() => toggleSection(NAV_MANAGEMENT.label)}
          isActive={isActive}
          isSectionActive={isSectionActive(NAV_MANAGEMENT)}
          onNavigate={() => setMobileOpen(false)}
        />
      </nav>

      {/* Separator */}
      <div className="border-t border-gray-200" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          Выйти
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer"
        aria-label="Открыть меню"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar */}
          <aside className="relative w-[260px] h-full bg-white shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400"
              aria-label="Закрыть меню"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:min-h-screen bg-white border-r border-gray-200 flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}

// ─── SidebarSection ──────────────────────────────────────────────────

function SidebarSection({
  section,
  expanded,
  onToggle,
  isActive,
  isSectionActive,
  onNavigate,
}: {
  section: NavSection;
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  isSectionActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
          isSectionActive
            ? 'text-primary font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{section.icon}</span>
          <span>{section.label}</span>
        </span>
        <span className="text-gray-400 text-xs">{expanded ? '\u25BE' : '\u25B8'}</span>
      </button>

      {expanded && (
        <div className="ml-4 mt-0.5">
          {section.items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium border-l-3 border-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
