import { supabase } from '@/lib/supabaseClient';

export function extensionForFile(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf('.');
  if (dot >= 0) {
    const ext = name.slice(dot).toLowerCase();
    if (/^\.(jpe?g|png|webp|gif)$/.test(ext)) return ext;
  }
  const t = file.type;
  if (t === 'image/jpeg' || t === 'image/jpg') return '.jpg';
  if (t === 'image/png') return '.png';
  if (t === 'image/webp') return '.webp';
  if (t === 'image/gif') return '.gif';
  return '';
}

/** Upload under `{tenantId}/{uuid}{ext}`; bucket must be public with tenant-scoped RLS. */
export async function uploadPublicEntityLogo(
  bucketId: string,
  tenantId: string,
  file: File
): Promise<string> {
  const ext = extensionForFile(file);
  const path = `${tenantId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(bucketId).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucketId).getPublicUrl(path);
  return data.publicUrl;
}
