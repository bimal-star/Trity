export interface BomKeyDetailsDraft {
  version: string;
  output_quantity: string;
  notes: string;
}

export function emptyBomKeyDetailsDraft(): BomKeyDetailsDraft {
  return {
    version: '1',
    output_quantity: '1',
    notes: '',
  };
}
