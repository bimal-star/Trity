'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setIsReady(!!data.session);
      } catch {
        if (!mounted) return;
        setIsReady(false);
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsReady(true);
        setIsChecking(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        toast.error(updateError.message || 'Failed to reset password.');
        return;
      }

      toast.success('Password updated. Redirecting to login…');
      await supabase.auth.signOut({ scope: 'local' });
      setTimeout(() => router.replace('/login'), 800);
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking reset link…</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className={`w-full max-w-md ${premiumSurfaces.cardElevated} !p-8 dark:!bg-gray-800`}>
          <h1 className={`${premiumTypography.pageTitle} mb-2 text-gray-900 dark:text-white`}>
            Invalid or expired link
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Please request a new password reset email.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full min-w-[10rem] h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className={`w-full max-w-md ${premiumSurfaces.cardElevated} !p-8 dark:!bg-gray-800`}>
        <h1 className={`${premiumTypography.pageTitle} mb-2 text-gray-900 dark:text-white`}>
          Reset your password
        </h1>
        <p className={`${premiumTypography.body} mb-6 text-gray-600 dark:text-gray-400`}>
          Enter a new password for your account.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-w-[10rem] h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
