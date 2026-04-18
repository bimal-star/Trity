'use client';

import { useCallback, useEffect, useState } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumInputCompact, premiumInputComfortableBase, premiumPrimaryButton, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { useTenant } from '@/contexts/TenantContext';
import type { Customer } from '@/types/customer';
import { Loader2, MapPin, Paperclip, StickyNote, UserCircle } from 'lucide-react';

interface CustomerRelatedPanelProps {
  customer: Customer;
}

export default function CustomerRelatedPanel({ customer }: CustomerRelatedPanelProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<
    { id: string; address_type: string; line1: string | null; city: string | null }[]
  >([]);
  const [contacts, setContacts] = useState<
    { id: string; first_name: string | null; last_name: string | null; email: string | null }[]
  >([]);
  const [notes, setNotes] = useState<{ id: string; note_text: string }[]>([]);
  const [attachments, setAttachments] = useState<
    { id: string; file_name: string; file_url: string }[]
  >([]);

  const [addrType, setAddrType] = useState<'billing' | 'shipping' | 'registered' | 'returns'>(
    'shipping'
  );
  const [addrLine1, setAddrLine1] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [noteText, setNoteText] = useState('');
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const [a, c, n, att] = await Promise.all([
        tenantedSupabase
          .from('customer_addresses')
          .select('id, address_type, line1, city')
          .eq('customer_id', customer.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        tenantedSupabase
          .from('customer_contacts')
          .select('id, first_name, last_name, email')
          .eq('customer_id', customer.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        tenantedSupabase
          .from('customer_notes')
          .select('id, note_text')
          .eq('customer_id', customer.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20),
        tenantedSupabase
          .from('customer_attachments')
          .select('id, file_name, file_url')
          .eq('customer_id', customer.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setAddresses((a.data || []) as any);
      setContacts((c.data || []) as any);
      setNotes((n.data || []) as any);
      setAttachments((att.data || []) as any);
    } catch {
      setMsg('Could not load related records.');
    } finally {
      setLoading(false);
    }
  }, [tenant_id, customer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const addAddress = async () => {
    if (!tenant_id || !addrLine1.trim()) return;
    const { error } = await tenantedSupabase.from('customer_addresses').insert({
      tenant_id,
      customer_id: customer.id,
      address_type: addrType,
      line1: addrLine1.trim(),
      city: addrCity.trim() || null,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    } as any);
    if (error) setMsg(error.message);
    else {
      setAddrLine1('');
      setAddrCity('');
      void load();
    }
  };

  const addContact = async () => {
    if (!tenant_id) return;
    const { error } = await tenantedSupabase.from('customer_contacts').insert({
      tenant_id,
      customer_id: customer.id,
      first_name: contactFirst.trim() || null,
      last_name: contactLast.trim() || null,
      email: contactEmail.trim() || null,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    } as any);
    if (error) setMsg(error.message);
    else {
      setContactFirst('');
      setContactLast('');
      setContactEmail('');
      void load();
    }
  };

  const addNote = async () => {
    if (!tenant_id || !noteText.trim()) return;
    const { error } = await tenantedSupabase.from('customer_notes').insert({
      tenant_id,
      customer_id: customer.id,
      note_text: noteText.trim(),
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    } as any);
    if (error) setMsg(error.message);
    else {
      setNoteText('');
      void load();
    }
  };

  const addAttachment = async () => {
    if (!tenant_id || !attachName.trim() || !attachUrl.trim()) return;
    const { error } = await tenantedSupabase.from('customer_attachments').insert({
      tenant_id,
      customer_id: customer.id,
      file_name: attachName.trim(),
      file_url: attachUrl.trim(),
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    } as any);
    if (error) setMsg(error.message);
    else {
      setAttachName('');
      setAttachUrl('');
      void load();
    }
  };

  if (loading) {
    return (
      <PremiumCard className="flex min-h-[200px] items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className={premiumTypography.helper}>Loading related data…</span>
      </PremiumCard>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      {msg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {msg}
        </div>
      )}

      <PremiumCard className={`space-y-3 ${premiumSurfaces.card}`}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Additional addresses</h3>
        </div>
        <p className={premiumTypography.helper}>
          Extra typed addresses (billing, shipping, …). Primary address stays on the Profile tab.
        </p>
        <ul className="space-y-1 text-sm">
          {addresses.length === 0 && (
            <li className={premiumTypography.helper}>No extra addresses yet.</li>
          )}
          {addresses.map((ad) => (
            <li key={ad.id} className="text-gray-800 dark:text-gray-200">
              <span className="font-medium capitalize">{ad.address_type}</span>
              {ad.line1 ? ` · ${ad.line1}` : ''}
              {ad.city ? `, ${ad.city}` : ''}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <div>
            <label className={premiumTypography.label}>Type</label>
            <select
              value={addrType}
              onChange={(e) => setAddrType(e.target.value as typeof addrType)}
              className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
            >
              <option value="billing">Billing</option>
              <option value="shipping">Shipping</option>
              <option value="registered">Registered</option>
              <option value="returns">Returns</option>
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className={premiumTypography.label}>Line 1</label>
            <input
              value={addrLine1}
              onChange={(e) => setAddrLine1(e.target.value)}
              className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
            />
          </div>
          <div className="w-32">
            <label className={premiumTypography.label}>City</label>
            <input
              value={addrCity}
              onChange={(e) => setAddrCity(e.target.value)}
              className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
            />
          </div>
          <button
            type="button"
            onClick={() => void addAddress()}
            className={premiumPrimaryButton('businessCore', 'sm', 'auto')}
          >
            Add address
          </button>
        </div>
      </PremiumCard>

      <PremiumCard className={`space-y-3 ${premiumSurfaces.card}`}>
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Contacts</h3>
        </div>
        <ul className="space-y-1 text-sm">
          {contacts.length === 0 && <li className={premiumTypography.helper}>No contacts yet.</li>}
          {contacts.map((co) => (
            <li key={co.id} className="text-gray-800 dark:text-gray-200">
              {[co.first_name, co.last_name].filter(Boolean).join(' ') || '—'}
              {co.email ? ` · ${co.email}` : ''}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <input
            placeholder="First"
            value={contactFirst}
            onChange={(e) => setContactFirst(e.target.value)}
            className={`!w-28 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
          />
          <input
            placeholder="Last"
            value={contactLast}
            onChange={(e) => setContactLast(e.target.value)}
            className={`!w-28 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
          />
          <input
            placeholder="Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={`min-w-[140px] flex-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
          />
          <button
            type="button"
            onClick={() => void addContact()}
            className={premiumPrimaryButton('businessCore', 'sm', 'auto')}
          >
            Add contact
          </button>
        </div>
      </PremiumCard>

      <PremiumCard className={`space-y-3 ${premiumSurfaces.card}`}>
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Notes</h3>
        </div>
        <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
          {notes.length === 0 && <li className={premiumTypography.helper}>No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-gray-100 px-2 py-1 dark:border-gray-700">
              {n.note_text}
            </li>
          ))}
        </ul>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          placeholder="Add an internal note…"
          className={`w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-600 dark:bg-gray-900`}
        />
        <button
          type="button"
          onClick={() => void addNote()}
          className={premiumPrimaryButton('businessCore', 'sm', 'auto')}
        >
          Save note
        </button>
      </PremiumCard>

      <PremiumCard className={`space-y-3 ${premiumSurfaces.card}`}>
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Attachments</h3>
        </div>
        <p className={premiumTypography.helper}>Store links to files (e.g. signed PDFs in your storage).</p>
        <ul className="space-y-1 text-sm">
          {attachments.length === 0 && (
            <li className={premiumTypography.helper}>No attachments yet.</li>
          )}
          {attachments.map((at) => (
            <li key={at.id}>
              <a
                href={at.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline dark:text-green-400"
              >
                {at.file_name}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <input
            placeholder="File name"
            value={attachName}
            onChange={(e) => setAttachName(e.target.value)}
            className={`min-w-[120px] flex-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
          />
          <input
            placeholder="https://…"
            value={attachUrl}
            onChange={(e) => setAttachUrl(e.target.value)}
            className={`min-w-[160px] flex-[2] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
          />
          <button
            type="button"
            onClick={() => void addAttachment()}
            className={premiumPrimaryButton('businessCore', 'sm', 'auto')}
          >
            Add link
          </button>
        </div>
      </PremiumCard>
    </div>
  );
}
