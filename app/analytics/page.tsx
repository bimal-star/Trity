'use client';

import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <PageContainer module="analytics">
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-500">
              Analytics
            </h1>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-blue-700 dark:text-blue-500 ml-11">
            View insights and metrics across your workspace
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />
      </PageContainer>
    </ProtectedRoute>
  );
}
