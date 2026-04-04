import React from 'react';
import { PackingConfiguration } from '@/types/product';
import { Plus, X } from 'lucide-react';

interface PackingConfigurationsEditorProps {
  value: PackingConfiguration[];
  onChange: (configs: PackingConfiguration[]) => void;
}

const emptyConfig: PackingConfiguration = {
  level: '',
  quantity: 1,
  length: 0,
  width: 0,
  height: 0,
  weight: 0,
  weight_unit_id: '',
  dimension_unit_id: '',
  is_default: false,
  description: '',
};

export default function PackingConfigurationsEditor({
  value,
  onChange,
}: PackingConfigurationsEditorProps) {
  const handleFieldChange = (idx: number, field: keyof PackingConfiguration, fieldValue: any) => {
    const updated = value.map((cfg, i) => (i === idx ? { ...cfg, [field]: fieldValue } : cfg));
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { ...emptyConfig }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const inputClass =
    'w-full px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-500';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 dark:border-gray-700 text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/40">
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Level
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Length
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Width
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Height
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Weight
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Weight Unit
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Dim Unit
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Default
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Description
            </th>
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {value.length === 0 && (
            <tr>
              <td colSpan={11} className="text-center text-gray-400 py-3">
                No packing configurations
              </td>
            </tr>
          )}
          {value.map((cfg, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="text"
                  value={cfg.level || ''}
                  onChange={(e) => handleFieldChange(idx, 'level', e.target.value)}
                  className={`${inputClass} w-16`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="number"
                  value={cfg.quantity ?? 1}
                  min={1}
                  onChange={(e) => handleFieldChange(idx, 'quantity', Number(e.target.value))}
                  className={`${inputClass} w-12`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="number"
                  value={cfg.length ?? 0}
                  onChange={(e) => handleFieldChange(idx, 'length', Number(e.target.value))}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="number"
                  value={cfg.width ?? 0}
                  onChange={(e) => handleFieldChange(idx, 'width', Number(e.target.value))}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="number"
                  value={cfg.height ?? 0}
                  onChange={(e) => handleFieldChange(idx, 'height', Number(e.target.value))}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="number"
                  value={cfg.weight ?? 0}
                  onChange={(e) => handleFieldChange(idx, 'weight', Number(e.target.value))}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="text"
                  value={cfg.weight_unit_id || ''}
                  onChange={(e) => handleFieldChange(idx, 'weight_unit_id', e.target.value)}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="text"
                  value={cfg.dimension_unit_id || ''}
                  onChange={(e) => handleFieldChange(idx, 'dimension_unit_id', e.target.value)}
                  className={`${inputClass} w-14`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={!!cfg.is_default}
                  onChange={(e) => handleFieldChange(idx, 'is_default', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                <input
                  type="text"
                  value={cfg.description || ''}
                  onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                  className={`${inputClass} w-28`}
                />
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-0.5 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors inline-flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Add Row
      </button>
    </div>
  );
}
