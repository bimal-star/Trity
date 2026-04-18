'use client';

import { useState, useRef, useEffect } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarEntry } from '@/types/calendar';
import { Search, Download, BarChart2, Calendar, Eye, EyeOff, Printer, Edit2, Check, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Send, MessageCircle } from 'lucide-react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { logCalendarEventUpdated } from '@/lib/auditLog';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumTertiaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { useTenant } from '@/contexts/TenantContext';

const businessCoreAccent = pillarAccent('businessCore');

export default function CalendarPage() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const { effectiveTenantId: tenant_id, user } = useTenant();
  
  const { data: calendarData, isLoading, error: calendarError, updateCalendarEntry } = useCalendar(year);
  const { toast } = useToast();
  
  // State management
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<CalendarEntry>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showJumpToDate, setShowJumpToDate] = useState(false);
  const [jumpDate, setJumpDate] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [quickUpdateEntry, setQuickUpdateEntry] = useState<CalendarEntry | null>(null);
  const [quickUpdateData, setQuickUpdateData] = useState<Partial<CalendarEntry>>({});
  const [quickUpdateDate, setQuickUpdateDate] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('GB');
  const [isImporting, setIsImporting] = useState(false);
  const todayRowRef = useRef<HTMLTableRowElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to today's row when data loads (only once on initial load)
  useEffect(() => {
    if (calendarData && todayRowRef.current && tableContainerRef.current) {
      setTimeout(() => {
        const container = tableContainerRef.current;
        const todayRow = todayRowRef.current;
        if (!container || !todayRow) return;

        // Get the position of today's row relative to the container
        const containerRect = container.getBoundingClientRect();
        const rowRect = todayRow.getBoundingClientRect();
        const headerHeight = container.querySelector('thead')?.getBoundingClientRect().height || 0;
        
        // Calculate scroll position to center the row in the visible area
        const scrollTop = container.scrollTop + (rowRect.top - containerRect.top) - headerHeight - 20;
        
        // Scroll smoothly within the container only
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [calendarData]);

  // Scroll to today's row when data loads
  useEffect(() => {
    if (calendarData && todayRowRef.current && tableContainerRef.current) {
      setTimeout(() => {
        const container = tableContainerRef.current;
        const todayRow = todayRowRef.current;
        if (!container || !todayRow) return;

        // Get the position of today's row relative to the container
        const containerRect = container.getBoundingClientRect();
        const rowRect = todayRow.getBoundingClientRect();
        const headerHeight = container.querySelector('thead')?.getBoundingClientRect().height || 0;
        
        // Calculate scroll position to center the row in the visible area
        const scrollTop = container.scrollTop + (rowRect.top - containerRect.top) - headerHeight - 20;
        
        // Scroll smoothly within the container only
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [calendarData]);

  // Close column menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnMenu]);

  // Load data when date is selected in quick update
  useEffect(() => {
    if (quickUpdateDate && calendarData) {
      const entry = calendarData.find(e => e.date === quickUpdateDate);
      if (entry) {
        setQuickUpdateData({
          bank_holiday: entry.bank_holiday || '',
          events: entry.events || '',
          notes: entry.notes || ''
        });
      }
    }
  }, [quickUpdateDate, calendarData]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isProcessing]);

  // Year navigation
  const goToPreviousYear = () => setYear(year - 1);
  const goToNextYear = () => setYear(year + 1);
  const goToCurrentYear = () => setYear(currentDate.getFullYear());

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isToday = (entry: CalendarEntry) => {
    return (
      entry.day === currentDate.getDate() &&
      entry.month === currentDate.getMonth() + 1 &&
      entry.year === currentDate.getFullYear()
    );
  };

  // Editing functions
  const startEdit = (entry: CalendarEntry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: number) => {
    const result = await updateCalendarEntry(id, {
      bank_holiday: editData.bank_holiday,
      events: editData.events,
      notes: editData.notes
    });
    
    if (result.success === false) {
      toast.error('Failed to save changes. Please try again.');
      return;
    }

    toast.success('Calendar entry updated.');

    // Log the calendar event update to audit trail
    if (tenant_id) {
      const originalEntry = calendarData?.find(e => e.id === id);
      if (originalEntry) {
        const changes: Record<string, unknown> = {};
        if (editData.bank_holiday !== originalEntry.bank_holiday) {
          changes.bank_holiday = { before: originalEntry.bank_holiday, after: editData.bank_holiday };
        }
        if (editData.events !== originalEntry.events) {
          changes.events = { before: originalEntry.events, after: editData.events };
        }
        if (editData.notes !== originalEntry.notes) {
          changes.notes = { before: originalEntry.notes, after: editData.notes };
        }
        
        if (Object.keys(changes).length > 0) {
          await logCalendarEventUpdated(
            tenant_id,
            `calendar-${id}`,
            changes,
            user?.id || null
          );
        }
      }
    }
    
    setEditingId(null);
    setEditData({});
  };

  // Quick update functions
  const openQuickUpdate = () => {
    setQuickUpdateDate('');
    setQuickUpdateData({
      bank_holiday: '',
      events: '',
      notes: ''
    });
    setShowQuickUpdate(true);
  };

  const saveQuickUpdate = async () => {
    if (!quickUpdateDate || !calendarData) {
      toast.error('Please select a date');
      return;
    }
    const entry = calendarData.find(e => e.date === quickUpdateDate);
    if (!entry) {
      toast.error('Date not found in calendar');
      return;
    }

    // Update database
    const result = await updateCalendarEntry(entry.id, quickUpdateData);

    if (result.success === false) {
      toast.error('Failed to update database. Please try again.');
      return;
    }

    toast.success('Calendar entry updated.');
    
    // Log the calendar event update to audit trail
    if (tenant_id) {
      const changes: Record<string, unknown> = {};
      if (quickUpdateData.bank_holiday !== entry.bank_holiday) {
        changes.bank_holiday = { before: entry.bank_holiday, after: quickUpdateData.bank_holiday };
      }
      if (quickUpdateData.events !== entry.events) {
        changes.events = { before: entry.events, after: quickUpdateData.events };
      }
      if (quickUpdateData.notes !== entry.notes) {
        changes.notes = { before: entry.notes, after: quickUpdateData.notes };
      }
      
      if (Object.keys(changes).length > 0) {
        await logCalendarEventUpdated(
          tenant_id,
          `calendar-${entry.id}`,
          changes,
          user?.id || null
        );
      }
    }
    
    setShowQuickUpdate(false);
    setQuickUpdateEntry(null);
    setQuickUpdateData({});
    setQuickUpdateDate('');
  };

  // Chat assistant functions
  const processChatQuery = (query: string): string => {
    if (!calendarData) return 'Calendar data is not loaded yet.';

    const lowerQuery = query.toLowerCase();

    // Bank holidays queries
    if (lowerQuery.includes('bank holiday') || lowerQuery.includes('bank holidays')) {
      const bankHolidays = calendarData.filter(entry => entry.bank_holiday && entry.bank_holiday.trim() !== '');
      if (bankHolidays.length === 0) return `No bank holidays found for ${year}.`;
      
      const list = bankHolidays.map(entry => 
        `• ${formatDate(entry.date)} - ${entry.bank_holiday}`
      ).join('\n');
      return `Found ${bankHolidays.length} bank holiday(s) in ${year}:\n\n${list}`;
    }

    // Events queries
    if (lowerQuery.includes('event') && !lowerQuery.includes('no event')) {
      const withEvents = calendarData.filter(entry => entry.events);
      if (withEvents.length === 0) return `No events found for ${year}.`;
      
      const list = withEvents.slice(0, 10).map(entry => 
        `• ${formatDate(entry.date)} - ${entry.events}`
      ).join('\n');
      const more = withEvents.length > 10 ? `\n\n...and ${withEvents.length - 10} more` : '';
      return `Found ${withEvents.length} day(s) with events in ${year}:\n\n${list}${more}`;
    }

    // Notes queries
    if (lowerQuery.includes('note')) {
      const withNotes = calendarData.filter(entry => entry.notes);
      if (withNotes.length === 0) return `No notes found for ${year}.`;
      return `Found ${withNotes.length} day(s) with notes in ${year}.`;
    }

    // Statistics queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total')) {
      const bankHolidays = calendarData.filter(e => e.bank_holiday).length;
      const events = calendarData.filter(e => e.events).length;
      const notes = calendarData.filter(e => e.notes).length;
      return `Statistics for ${year}:\n\n• Total days: ${calendarData.length}\n• Bank holidays: ${bankHolidays}\n• Days with events: ${events}\n• Days with notes: ${notes}`;
    }

    // Month-specific queries
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = months.findIndex(m => lowerQuery.includes(m));
    if (monthIndex !== -1) {
      const monthData = calendarData.filter(entry => entry.month === monthIndex + 1);
      const bankHolidays = monthData.filter(e => e.bank_holiday).length;
      const events = monthData.filter(e => e.events).length;
      return `${months[monthIndex].charAt(0).toUpperCase() + months[monthIndex].slice(1)} ${year}:\n\n• Total days: ${monthData.length}\n• Bank holidays: ${bankHolidays}\n• Days with events: ${events}`;
    }

    // Default response
    return "I can help you with queries like:\n\n• 'List all bank holidays for 2025'\n• 'Show me events'\n• 'How many days with notes?'\n• 'What's in March?'\n\nTry asking something!";
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setIsProcessing(true);
    setTimeout(() => {
      const response = processChatQuery(userMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsProcessing(false);
    }, 500);
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatInput('');
  };

  // Import holidays from Nager.Date API
  const importHolidays = async () => {
    setIsImporting(true);
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${selectedCountry}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch holidays');
      }

      const holidays = await response.json();
      let updatedCount = 0;
      let errors = 0;

      for (const holiday of holidays) {
        // Find matching entry in calendar by date
        const entry = calendarData?.find(e => e.date === holiday.date);
        
        if (entry) {
          const result = await updateCalendarEntry(entry.id, {
            bank_holiday: holiday.localName || holiday.name
          });
          
          if (result.success !== false) {
            updatedCount++;
          } else {
            errors++;
          }
        }
      }

      toast.success(`Successfully imported ${updatedCount} bank holidays!${errors > 0 ? ` (${errors} errors)` : ''}`);
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing holidays:', error);
      toast.error('Failed to import holidays. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const getCalendarExportData = () => ({
    headers: ['Date', 'Day', 'Month', 'Year', 'Week', 'Bank Holiday', 'Events', 'Notes'],
    rows: (filteredData || []).map((entry) => [
      formatDate(entry.date),
      entry.day_name,
      entry.month_name,
      entry.year,
      entry.week_iso,
      entry.bank_holiday || '',
      entry.events || '',
      entry.notes || '',
    ]),
  });

  // Jump to date
  const jumpToDate = () => {
    if (!jumpDate) return;
    const targetDate = new Date(jumpDate);
    const targetRow = document.querySelector(`[data-date="${jumpDate}"]`);
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowJumpToDate(false);
  };

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(column)) {
      newHidden.delete(column);
    } else {
      newHidden.add(column);
    }
    setHiddenColumns(newHidden);
  };

  // Use all data (no filtering)
  const filteredData = calendarData;

  // Calculate statistics
  const stats = filteredData ? {
    totalDays: filteredData.length,
    bankHolidays: filteredData.filter(e => e.bank_holiday).length,
    eventsCount: filteredData.filter(e => e.events).length,
    notesCount: filteredData.filter(e => e.notes).length,
  } : null;

  const densityClasses = {
    compact: 'px-2 py-0',
    comfortable: 'px-4 py-0.5',
    spacious: 'px-6 py-1'
  };

  if (isLoading) {
    return (
      <PageContainer module="businessCore">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading calendar...</div>
      </PageContainer>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={Calendar}
          title="Calendar"
          subtitle="View and manage holiday schedules and important dates"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${businessCoreAccent.subtitleTint}`}
          right={
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={goToCurrentYear}
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                Current Year
              </button>
              <button
                type="button"
                onClick={goToPreviousYear}
                className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="min-w-[80px] text-center text-sm font-semibold text-gray-900 dark:text-white">
                {year}
              </h2>
              <button
                type="button"
                onClick={goToNextYear}
                className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

      {calendarError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {calendarError.message}
        </div>
      )}

      {/* Statistics Panel — shell + cards aligned with components/products/ProductMasterCard.tsx */}
        {stats && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 shadow-md ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900/30 dark:ring-white/5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {(
                [
                  { label: 'Total Days', value: stats.totalDays },
                  { label: 'Bank Holidays', value: stats.bankHolidays },
                  { label: 'Days with Events', value: stats.eventsCount },
                  { label: 'Days with Notes', value: stats.notesCount },
                ] as const
              ).map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-200 border-l-[5px] border-l-green-600 bg-gradient-to-r from-green-50/70 via-white to-white px-4 py-3 shadow-md ring-1 ring-black/5 dark:border-gray-700 dark:border-l-green-500 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800 dark:ring-white/5"
                >
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {label}
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap gap-3 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          {/* Search - Most important, takes full width on mobile */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events, notes, holidays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Primary Actions */}
          <button
            onClick={openQuickUpdate}
            className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Quick Update
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
          >
            <Download className="w-3.5 h-3.5" />
            Import Holidays
          </button>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Jump to Date */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            <input
              type="date"
              value={jumpDate}
              onChange={(e) => setJumpDate(e.target.value)}
              className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs"
            />
            <button
              onClick={jumpToDate}
              className={premiumTertiaryButton('sm', 'standard')}
            >
              Go
            </button>
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Export/Output Actions */}
          <ExportFormatDropdown
            filenameBase={`calendar-${year}`}
            title="Export calendar as CSV"
            getData={getCalendarExportData}
            buttonClassName={premiumTertiaryButton('sm', 'standard')}
          />

          <button
            onClick={() => window.print()}
            className={premiumTertiaryButton('sm', 'standard')}
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-gray-300 dark:bg-gray-600" />

          {/* View Options */}
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs"
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>

          <div className="relative" ref={columnMenuRef}>
            <button 
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={premiumTertiaryButton('sm', 'standard')}
            >
              <Eye className="w-3.5 h-3.5" />
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-20 min-w-[150px] border border-gray-200 dark:border-gray-700">
                {['day', 'month', 'year', 'week', 'bankHoliday', 'events', 'notes'].map(col => (
                  <label key={col} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{col === 'bankHoliday' ? 'Bank Holiday' : col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div 
            ref={tableContainerRef}
            className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto scroll-smooth"
          >
            <table className="w-full">
              <thead 
                className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm select-none [user-drag:none] [-webkit-user-drag:none]" 
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
              >
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-36" draggable={false}>Date</th>
                  {!hiddenColumns.has('day') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-24" draggable={false}>Day</th>}
                  {!hiddenColumns.has('month') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-28" draggable={false}>Month</th>}
                  {!hiddenColumns.has('year') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-20" draggable={false}>Year</th>}
                  {!hiddenColumns.has('week') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-20" draggable={false}>Week</th>}
                  {!hiddenColumns.has('bankHoliday') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-48" draggable={false}>Bank Holiday</th>}
                  {!hiddenColumns.has('events') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide w-48" draggable={false}>Events</th>}
                  {!hiddenColumns.has('notes') && <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default uppercase tracking-wide" draggable={false}>Notes</th>}
                  <th className="py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300 cursor-default w-16" draggable={false}>
                    <div className="flex items-center justify-center">
                      <span title="Actions">
                        <Edit2 className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData && filteredData.map((entry: CalendarEntry, index: number) => {
                  const prevEntry = index > 0 ? filteredData[index - 1] : null;
                  const isNewWeek = !prevEntry || entry.week_iso !== prevEntry.week_iso;
                  const isEvenWeek = entry.week_iso % 2 === 0;
                  const todayHighlight = isToday(entry);
                  const isEditing = editingId === entry.id;
                  
                  return (
                    <tr
                      key={entry.id}
                      ref={todayHighlight ? todayRowRef : null}
                      data-date={entry.date}
                      className={`
                        ${isNewWeek ? 'border-t-2 border-gray-300 dark:border-gray-600' : 'border-t border-gray-200 dark:border-gray-700'}
                        ${todayHighlight ? 'bg-green-50 dark:bg-green-900/25' : isEvenWeek ? 'bg-gray-50 dark:bg-gray-900/30' : 'bg-white dark:bg-gray-800'}
                        ${todayHighlight ? 'hover:bg-green-100 dark:hover:bg-green-900/35' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}
                        transition-colors
                      `}
                    >
                      <td className={`${densityClasses[density]} text-xs text-gray-900 dark:text-gray-100`}>{formatDate(entry.date)}</td>
                      {!hiddenColumns.has('day') && <td className={`${densityClasses[density]} text-xs text-gray-900 dark:text-gray-100`}>{entry.day_name}</td>}
                      {!hiddenColumns.has('month') && <td className={`${densityClasses[density]} text-xs text-gray-900 dark:text-gray-100`}>{entry.month_name}</td>}
                      {!hiddenColumns.has('year') && <td className={`${densityClasses[density]} text-xs text-gray-900 dark:text-gray-100`}>{entry.year}</td>}
                      {!hiddenColumns.has('week') && <td className={`${densityClasses[density]} text-xs text-gray-900 dark:text-gray-100`}>{entry.week_iso}</td>}
                      {!hiddenColumns.has('bankHoliday') && <td className={`${densityClasses[density]} text-xs`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.bank_holiday || ''}
                            onChange={(e) => setEditData({ ...editData, bank_holiday: e.target.value })}
                            className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{entry.bank_holiday || '-'}</span>
                        )}
                      </td>}
                      {!hiddenColumns.has('events') && <td className={`${densityClasses[density]} text-xs`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.events || ''}
                            onChange={(e) => setEditData({ ...editData, events: e.target.value })}
                            className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{entry.events || '-'}</span>
                        )}
                      </td>}
                      {!hiddenColumns.has('notes') && <td className={`${densityClasses[density]} text-xs`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.notes || ''}
                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                            className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{entry.notes || '-'}</span>
                        )}
                      </td>}
                      <td className={`${densityClasses[density]} text-xs`}>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(entry.id)}
                              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                            >
                              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                            title="Edit Row"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Update Modal */}
        {showQuickUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowQuickUpdate(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4 rounded-t-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Quick Update
                </h3>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={quickUpdateDate}
                    onChange={(e) => setQuickUpdateDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Bank Holiday
                  </label>
                  <input
                    type="text"
                    value={quickUpdateData.bank_holiday || ''}
                    onChange={(e) => setQuickUpdateData({ ...quickUpdateData, bank_holiday: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., New Year's Day"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Events
                  </label>
                  <textarea
                    value={quickUpdateData.events || ''}
                    onChange={(e) => setQuickUpdateData({ ...quickUpdateData, events: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Add event details..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={quickUpdateData.notes || ''}
                    onChange={(e) => setQuickUpdateData({ ...quickUpdateData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Add additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 rounded-b-xl flex gap-3">
                <button
                  onClick={saveQuickUpdate}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setShowQuickUpdate(false)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-650 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Holidays Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowImportModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 px-6 py-4 rounded-t-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Import Bank Holidays
                </h3>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Country
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="NL">Netherlands</option>
                    <option value="BE">Belgium</option>
                    <option value="CH">Switzerland</option>
                    <option value="AT">Austria</option>
                    <option value="IE">Ireland</option>
                    <option value="SE">Sweden</option>
                    <option value="NO">Norway</option>
                    <option value="DK">Denmark</option>
                    <option value="FI">Finland</option>
                    <option value="PL">Poland</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                    <option value="IN">India</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="SG">Singapore</option>
                    <option value="BR">Brazil</option>
                    <option value="MX">Mexico</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    This will fetch {year} bank holidays for the selected country and populate them in your calendar.
                  </p>
                </div>

                {isImporting && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Importing holidays...</p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 rounded-b-xl flex gap-3">
                <button
                  onClick={importHolidays}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isImporting ? 'Importing...' : 'Import'}
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-650 disabled:opacity-50 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Assistant */}
        <div className="fixed bottom-6 right-6 z-50">
          {showChat ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col border border-gray-200 dark:border-gray-700">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 px-4 py-3 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <h3 className="text-white font-semibold">Calendar Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="px-2 py-1 text-xs font-medium text-white rounded-lg hover:bg-white/20 transition-colors"
                      title="Clear chat"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-1 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Ask me anything about your calendar!</p>
                    <p className="text-xs mt-2">Try: "List all bank holidays"</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isProcessing}
                    className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowChat(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
              title="Calendar Assistant"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">
                Ask me
              </span>
            </button>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
