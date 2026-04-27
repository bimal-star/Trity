'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import { isValidTenantId, setTenantCache } from '@/lib/tenantCache';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const didRedirectRef = useRef(false);
  const { user, ready, error: tenantContextError } = useTenant();
  const { toast } = useToast();
  const authLoading = !ready;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Redirect if already authenticated (once per session on /login; reset when logged out).
  // Do not wait for `ready`: SIGNED_IN sets `user` immediately while tenant revalidate keeps
  // `isLoading` true, so `ready` is false and waiting would leave the page stuck on "Redirecting...".
  useEffect(() => {
    if (!user) {
      didRedirectRef.current = false;
      return;
    }
    if (pathname !== '/login') return;
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;
    router.replace('/');
  }, [user, router, pathname]);

  /** One profile read when JWT has no tenant_id — same row TenantContext will use; avoids duplicate work. */
  async function resolveTenantIdForLoginUser(user: User): Promise<string | null> {
    const um = user.user_metadata?.tenant_id;
    const am = user.app_metadata?.tenant_id;
    if (isValidTenantId(um)) return um;
    if (isValidTenantId(am)) return am;
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    if (error || !profile?.tenant_id || !isValidTenantId(profile.tenant_id)) return null;
    return profile.tenant_id;
  }

  async function fetchTenantDisplayName(tenantId: string) {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, company_name')
        .eq('id', tenantId)
        .single();
      if (!error && tenant) {
        const name = tenant.name || tenant.company_name;
        setTenantName(name || null);
        return;
      }
    } catch {
      /* tenants table missing or RLS */
    }
    setTenantName(null);
  }

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const SIGN_IN_TIMEOUT_MS = 30_000;

    try {
      console.log('🔐 Starting sign-in for:', email.trim());

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('SIGN_IN_TIMEOUT')), SIGN_IN_TIMEOUT_MS);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      let data: Awaited<typeof signInPromise>['data'];
      let signInError: Awaited<typeof signInPromise>['error'];
      try {
        const result = await Promise.race([
          signInPromise.finally(() => {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          }),
          timeoutPromise,
        ]);
        data = result.data;
        signInError = result.error;
      } catch (raceErr) {
        if (raceErr instanceof Error && raceErr.message === 'SIGN_IN_TIMEOUT') {
          toast.error(
            'Sign-in timed out. Check your network, Supabase URL in .env.local, and try again. If this persists, open the browser Network tab and look for failed requests to your Supabase host.'
          );
          return;
        }
        throw raceErr;
      }

      console.log('🔐 Sign-in response:', { hasData: !!data, hasError: !!signInError });

      if (signInError) {
        const msg = signInError.message || '';
        if (msg.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (msg.includes('Email not confirmed')) {
          toast.error('Please verify your email address before signing in.');
        } else if (msg.includes('Too many requests')) {
          toast.error('Too many login attempts. Please try again later.');
        } else if (
          msg.includes('Failed to fetch') ||
          msg.includes('NetworkError') ||
          msg.includes('Load failed') ||
          msg.includes('Network request failed')
        ) {
          toast.error(
            'Cannot reach Supabase (network error). Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local match your project, then restart the dev server.'
          );
        } else {
          toast.error(msg || 'An error occurred during sign in. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      if (data?.user) {
        const uid = data.user.id;
        const tid = await resolveTenantIdForLoginUser(data.user);
        if (tid) {
          setTenantCache(uid, tid);
        }

        const metadataName =
          data.user.user_metadata?.tenant_name ||
          data.user.user_metadata?.company_name ||
          data.user.user_metadata?.organization_name ||
          null;

        if (metadataName) {
          setTenantName(metadataName);
        } else if (tid) {
          void fetchTenantDisplayName(tid).catch((err) => {
            console.error('Error fetching tenant display name:', err);
          });
        } else {
          setTenantName(null);
        }

        // LayoutWrapper confirms getSession() before redirecting guests to /login, so early
        // navigation here is safe even if TenantContext.user is one frame behind.
        console.log('✓ Sign-in successful, redirecting to dashboard');

        didRedirectRef.current = true;
        router.replace('/');
        return;
      }

      toast.error('Sign-in succeeded but session was not established. Please try again.');
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setValidationErrors({ email: 'Email is required' });
      return;
    }

    setIsResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        toast.error(resetError.message || 'Failed to send reset email.');
      } else {
        toast.success('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  // Don't render login form if already authenticated (redirect will happen via useEffect)
  // But show loading state instead of null to prevent blank page
  if (user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 overflow-x-hidden">
      {/* Watermark Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5 dark:opacity-[0.03]">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full max-w-4xl max-h-4xl"
            style={{ transform: 'rotate(-15deg)' }}
          >
            {/* Large Trity logo pattern - three dots connected */}
            <g>
              <circle cx="100" cy="50" r="8" className="fill-blue-500" />
              <circle cx="50" cy="150" r="8" className="fill-blue-600" />
              <circle cx="150" cy="150" r="8" className="fill-blue-700" />
              <line x1="100" y1="50" x2="50" y2="150" className="stroke-blue-600" strokeWidth="2" />
              <line
                x1="100"
                y1="50"
                x2="150"
                y2="150"
                className="stroke-blue-600"
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="150"
                x2="150"
                y2="150"
                className="stroke-blue-600"
                strokeWidth="2"
              />
            </g>
            {/* Additional smaller patterns for depth */}
            <g transform="translate(50, 50)">
              <circle cx="0" cy="0" r="4" className="fill-blue-400" opacity="0.5" />
              <circle cx="100" cy="0" r="4" className="fill-blue-400" opacity="0.5" />
              <circle cx="50" cy="100" r="4" className="fill-blue-400" opacity="0.5" />
            </g>
          </svg>
        </div>
      </div>

      {/* Login Form Container - positioned above watermark */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-8">
            <style jsx>{`
              @keyframes shine {
                0%,
                100% {
                  opacity: 0.6;
                  filter: brightness(1);
                }
                50% {
                  opacity: 1;
                  filter: brightness(1.5) drop-shadow(0 0 4px currentColor);
                }
              }
              .dot-1 {
                animation: shine 3s ease-in-out infinite;
                animation-delay: 0s;
              }
              .dot-2 {
                animation: shine 3s ease-in-out infinite;
                animation-delay: 1s;
              }
              .dot-3 {
                animation: shine 3s ease-in-out infinite;
                animation-delay: 2s;
              }
            `}</style>
            <svg viewBox="0 0 24 24" className="w-16 h-16">
              <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
              <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
              <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
              <line
                x1="12"
                y1="6"
                x2="7"
                y2="16"
                className="stroke-blue-400/60"
                strokeWidth="1.5"
              />
              <line
                x1="12"
                y1="6"
                x2="17"
                y2="16"
                className="stroke-blue-400/60"
                strokeWidth="1.5"
              />
              <line
                x1="7"
                y1="16"
                x2="17"
                y2="16"
                className="stroke-blue-400/60"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <h1 className={`${premiumTypography.pageTitle} mb-3 text-gray-900 dark:text-white`}>
            Welcome to Trity
          </h1>

          {/* Tenant Name (if available) - shown below heading */}
          {tenantName ? (
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              {tenantName}
            </p>
          ) : (
            <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
              Welcome to your workspace
            </p>
          )}

          <p className={premiumTypography.helper}>Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className={`${premiumSurfaces.cardElevated} !p-8 backdrop-blur-sm dark:!bg-gray-800`}>
          {tenantContextError && !user && !authLoading && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {tenantContextError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors ${
                  validationErrors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors ${
                  validationErrors.password
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-w-[10rem] h-10 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setShowReset((prev) => !prev)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showReset ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>

          {showReset && (
            <form onSubmit={handlePasswordReset} className="mt-4 space-y-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Enter your email and we’ll send a password reset link.
                </p>
                <button
                  type="submit"
                  disabled={isResetting || authLoading}
                  className="w-full min-w-[10rem] h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Sending…' : 'Send reset email'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}
