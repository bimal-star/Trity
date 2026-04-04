# Page Headers - Three Pillar Color Theme

## Color Assignment by Pillar

### Business Core Pillar (Green)

Background: `bg-green-600/10 dark:bg-green-500/10`
Text: `text-green-600 dark:text-green-400`

Pages:

- **Customers** (`app/customers/page.tsx`) - Users icon
- **Products** (`app/products/page.tsx`) - Package2 icon
- **Calendar** (`app/calendar/page.tsx`) - Calendar icon

### Analytics Pillar (Blue)

Background: `bg-blue-600/10 dark:bg-blue-500/10`
Text: `text-blue-600 dark:text-blue-400`

Pages:

- **Analytics** (`app/analytics/page.tsx`) - BarChart3 icon
- **Dashboard** (`app/page.tsx`) - BarChart3 icon (primary analytics focus)

### Execution Pillar (Orange)

Background: `bg-orange-600/10 dark:bg-orange-500/10`
Text: `text-orange-600 dark:text-orange-400`

Pages:

- **Workstreams** (`app/workstreams/page.tsx`) - Calendar icon

### Other/Administration (Gray)

Background: `bg-gray-600/10 dark:bg-gray-500/10`
Text: `text-gray-600 dark:text-gray-400`

Pages:

- **Users** (`app/users/page.tsx`) - Users icon
- **Groups** (`app/groups/page.tsx`) - Users icon
- **Profile** (`app/profile/page.tsx`) - User icon
- **Tenant Settings** (`app/tenant-settings/page.tsx`) - Settings icon
- **Navigation Manager** (`app/navigation-manager/page.tsx`) - GripVertical icon
- **Import/Export** (`app/import-export/page.tsx`) - Database icon
- **Reset Password** (no header color - login flow)

## Implementation Details

All page headers follow the same structure:

```tsx
<div className="p-2 bg-{color}-600/10 dark:bg-{color}-500/10 rounded-lg">
  <IconComponent className="w-5 h-5 text-{color}-600 dark:text-{color}-400" />
</div>
```

Where `{color}` is one of: `green`, `blue`, `orange`, or `gray`

## Consistency

✅ All pages compile without errors
✅ All header icon backgrounds use consistent sizing (p-2, w-5 h-5)
✅ All header colors match sidebar pillar theme
✅ Button colors on pages match their header icon colors
✅ Dark mode variants properly specified for all colors

## Last Updated

January 30, 2026
