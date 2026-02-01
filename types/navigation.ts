/**
 * Navigation System - Position-Based Hierarchical Structure
 * 
 * Updated: January 31, 2026
 * 
 * The Trity navigation system uses dot-notation position strings to support unlimited
 * hierarchy depth without foreign key constraints. This enables efficient drag-and-drop
 * reorganization and flexible navigation structures.
 * 
 * POSITION FORMAT:
 * - "1", "2", "3" - Root level (Pillars: Analytics, Business Core, Execution, Admin, Account)
 * - "1.1", "1.2", "2.3" - Level 1 (child of root)
 * - "1.1.1", "2.3.4" - Level 2 (grandchild)
 * - Unlimited depth: "1.1.1.1.1..."
 * 
 * PILLAR SYSTEM:
 * - Analytics (Blue #2563eb) - Reporting, forecasting, analytics
 * - Business Core (Green #16a34a) - Core business entities, products, customers, inventory
 * - Execution (Orange/Amber #b45309) - Planning, calendar, OKRs
 * - Administration (Gray #6b7280) - Users, settings, management
 * - Account (Gray #6b7280) - Profile and user settings
 */

/**
 * Navigation item interface matching the Supabase navigation table schema
 */
export interface NavigationItem {
  id: string;
  label: string;
  position: string | number;  // Dot-notation: "1", "1.1", "1.1.1", etc.
  is_enabled: boolean;
  path?: string | null;       // URL path or null for parent items
  children?: NavigationItem[];
  [key: string]: any;         // Accept any other fields from Supabase
}

/**
 * Response type for navigation fetch operations
 */
export interface NavigationResponse {
  data: NavigationItem[] | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Pillar types for sidebar color coding
 */
export type NavigationPillar = 'analytics' | 'businessCore' | 'execution' | 'other';

/**
 * Pillar configuration for icon and color mapping
 */
export interface PillarConfig {
  pillar: NavigationPillar;
  icon: any;  // lucide-react icon component
  color: {
    icon: string;    // Tailwind text color class
    accent: string;  // Tailwind accent color class
    hover: string;   // Tailwind hover color class
  };
}

