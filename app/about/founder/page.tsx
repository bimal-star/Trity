'use client';

import Link from 'next/link';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { ArrowUpRight, BadgeCheck, Building2, Linkedin, Sparkles, Target } from 'lucide-react';

const bc = pillarAccent('businessCore');

const highlights = [
  '20+ years across planning, manufacturing, logistics, and supply chain operations.',
  'Built production and planning systems spanning spreadsheets, MRP, APS, and ERP workflows.',
  'Leads end-to-end demand, planning, and operational finance rhythms in fast-moving food businesses.',
];

const principles = [
  'Build for operators first: clear workflows before bells and whistles.',
  'Keep decisions data-backed but human-friendly for planners and site teams.',
  'Design systems that reduce friction between commercial, operations, and finance.',
];

export default function FounderPage() {
  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/"
          backLabel="Back to dashboard"
          icon={Sparkles}
          title="Founder"
          subtitle="Why Trity exists and who is building it"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className={premiumSurfaces.card}>
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20">
                <Building2 className="h-7 w-7 text-green-700 dark:text-green-400" aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bimal Patel</h2>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">Founder, Trity</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Trity is shaped by years spent in planning rooms, factory operations, and supply chain
                  problem solving. The goal is simple: give teams a practical system that improves
                  clarity, cadence, and execution without forcing them into disconnected tools.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className={premiumTypography.sectionTitle}>Background highlights</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <h3 className={premiumTypography.sectionTitle}>Why Trity</h3>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Many operations still rely on manual handoffs and fragmented spreadsheets.
                Trity brings those workflows together so purchase-to-pay, supplier management,
                warehouse operations, and product decisions can run in one coherent system.
              </p>
            </div>
          </section>

          <aside className={premiumSurfaces.cardElevated}>
            <h3 className={premiumTypography.sectionTitle}>Operating principles</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {principles.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Connect</p>
              <Link
                href="https://www.linkedin.com/in/bimal-patel-bb556765"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline dark:text-green-400"
              >
                <Linkedin className="h-4 w-4" aria-hidden />
                LinkedIn profile
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
