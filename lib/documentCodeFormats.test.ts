import { describe, expect, it } from 'vitest';
import {
  defaultDocumentCodeFormat,
  describeDocumentCodePattern,
  parseDocumentCodePattern,
  previewDocumentCode,
} from '@/lib/documentCodeFormats';

describe('previewDocumentCode', () => {
  it('renders year + sequence for customer default', () => {
    const fmt = defaultDocumentCodeFormat('customer');
    const code = previewDocumentCode(fmt, 42, new Date('2026-05-25T12:00:00Z'));
    expect(code).toBe('CUS-2026-000042');
  });

  it('renders ymd for product default', () => {
    const fmt = defaultDocumentCodeFormat('product');
    const code = previewDocumentCode(fmt, 1, new Date('2026-05-25T12:00:00Z'));
    expect(code).toBe('PRD-20260525-00001');
  });

  it('renders prefix + sequence when no date', () => {
    const fmt = defaultDocumentCodeFormat('category');
    const code = previewDocumentCode(fmt, 7, new Date('2026-05-25T12:00:00Z'));
    expect(code).toBe('CAT-0007');
  });
});

describe('describeDocumentCodePattern', () => {
  it('describes year pattern', () => {
    const fmt = defaultDocumentCodeFormat('customer');
    expect(describeDocumentCodePattern(fmt)).toBe('CUS-{YYYY}-{SEQ:6}');
  });
});

describe('parseDocumentCodePattern', () => {
  it('round-trips customer default', () => {
    const fmt = defaultDocumentCodeFormat('customer');
    const pattern = describeDocumentCodePattern(fmt);
    const parsed = parseDocumentCodePattern(pattern);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toEqual({
        prefix: 'CUS',
        date_part: 'year',
        sequence_pad: 6,
        separator: '-',
      });
    }
  });

  it('parses category without date', () => {
    const parsed = parseDocumentCodePattern('CAT-{SEQ:4}');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.date_part).toBe('none');
      expect(parsed.value.prefix).toBe('CAT');
    }
  });

  it('requires SEQ token', () => {
    const parsed = parseDocumentCodePattern('CUS-YYYY');
    expect(parsed.ok).toBe(false);
  });
});
