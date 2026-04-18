import React from 'react';
import { PackingConfiguration } from '@/types/product';

interface PackingConfigurationsEditorProps {
  value: PackingConfiguration[];
  onChange: (configs: PackingConfiguration[]) => void;
}

const emptyConfig: PackingConfiguration = {
  level: 'unit',
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

export default function PackingConfigurationsEditor({ value, onChange }: PackingConfigurationsEditorProps) {
  const handleFieldChange = (idx: number, field: keyof PackingConfiguration, fieldValue: any) => {
    const updated = value.map((cfg, i) =>
      i === idx ? { ...cfg, [field]: fieldValue } : cfg
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { ...emptyConfig }]);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <table className="min-w-full border text-xs">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border px-2 py-1">Level</th>
            <th className="border px-2 py-1">Qty</th>
            <th className="border px-2 py-1">Length</th>
            <th className="border px-2 py-1">Width</th>
            <th className="border px-2 py-1">Height</th>
            <th className="border px-2 py-1">Weight</th>
            <th className="border px-2 py-1">Weight Unit</th>
            <th className="border px-2 py-1">Dim Unit</th>
            <th className="border px-2 py-1">Default</th>
            <th className="border px-2 py-1">Description</th>
            <th className="border px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {value.length === 0 && (
            <tr>
              <td colSpan={11} className="text-center text-gray-400 py-2">No packing configurations</td>
            </tr>
          )}
          {value.map((cfg, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">
                <input type="text" value={cfg.level || ''} onChange={e => handleFieldChange(idx, 'level', e.target.value)} className="w-16 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="number" value={cfg.quantity ?? 1} min={1} onChange={e => handleFieldChange(idx, 'quantity', Number(e.target.value))} className="w-12 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="number" value={cfg.length ?? 0} onChange={e => handleFieldChange(idx, 'length', Number(e.target.value))} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="number" value={cfg.width ?? 0} onChange={e => handleFieldChange(idx, 'width', Number(e.target.value))} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="number" value={cfg.height ?? 0} onChange={e => handleFieldChange(idx, 'height', Number(e.target.value))} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="number" value={cfg.weight ?? 0} onChange={e => handleFieldChange(idx, 'weight', Number(e.target.value))} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="text" value={cfg.weight_unit_id || ''} onChange={e => handleFieldChange(idx, 'weight_unit_id', e.target.value)} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1">
                <input type="text" value={cfg.dimension_unit_id || ''} onChange={e => handleFieldChange(idx, 'dimension_unit_id', e.target.value)} className="w-14 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1 text-center">
                <input type="checkbox" checked={!!cfg.is_default} onChange={e => handleFieldChange(idx, 'is_default', e.target.checked)} />
              </td>
              <td className="border px-2 py-1">
                <input type="text" value={cfg.description || ''} onChange={e => handleFieldChange(idx, 'description', e.target.value)} className="w-24 px-1 py-0.5 border rounded" />
              </td>
              <td className="border px-2 py-1 text-center">
                <button type="button" onClick={() => handleRemove(idx)} className="text-red-500 px-2">&times;</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={handleAdd} className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs">Add Packing Config</button>
    </div>
  );
}
