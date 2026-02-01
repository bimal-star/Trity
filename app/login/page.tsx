'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, refreshTenant, error: tenantContextError } = useTenant();
  const authLoading = !ready;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Fetch tenant name after successful login
  // This will be called in handleSubmit after authentication succeeds
  const fetchTenantName = async (userId: string) => {
    try {
      // Strategy 1: Check user metadata (if set during user creation)
      // This won't work for login page since user isn't logged in yet, but we'll try after login
      
      // Strategy 2: Query user_profiles to get tenant_id, then query tenants table if it exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.tenant_id) {
        // No profile found or no tenant_id - use generic message
        setTenantName(null);
        return;
      }

      // Strategy 3: Try to get tenant name from tenants table (if it exists)
      // Note: This table may not exist, so we'll catch the error gracefully
      try {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('name, company_name')
          .eq('id', profile.tenant_id)
          .single();

        if (!tenantError && tenant) {
          const name = tenant.name || tenant.company_name;
          if (name) {
            setTenantName(name);
            return;
          }
        }
      } catch (err) {
        // Tenants table doesn't exist or query failed - that's okay
        // We'll just use the generic message
      }

      // No tenant name found - use generic message
      setTenantName(null);
    } catch (err) {
      console.error('Error fetching tenant name:', err);
      setTenantName(null);
    }
  };

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
    setError(null);
    setResetMessage(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔐 Starting sign-in for:', email.trim());
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      console.log('🔐 Sign-in response:', { hasData: !!data, hasError: !!signInError });

      if (signInError) {
        // Handle specific Supabase auth errors
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else if (signInError.message.includes('Too many requests')) {
          setError('Too many login attempts. Please try again later.');
        } else {
          setError(signInError.message || 'An error occurred during sign in. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      if (data?.user) {
        // Clear any cached tenant data to force fresh fetch
        try {
          localStorage.removeItem('trity_tenant_cache');
        } catch {
          // Ignore localStorage errors
        }

        // Try to get tenant name from user metadata first (quick check)
        const metadataName = 
          data.user.user_metadata?.tenant_name || 
          data.user.user_metadata?.company_name ||
          data.user.user_metadata?.organization_name ||
          null;
        
        if (metadataName) {
          setTenantName(metadataName);
        } else {
          // Query database for tenant name (async, won't block redirect)
          fetchTenantName(data.user.id).catch(err => {
            console.error('Error fetching tenant name:', err);
          });
        }
        
        // Successfully signed in - redirect to dashboard
        // Note: Tenant name fetch is async and won't block redirect
        console.log('✓ Sign-in successful, redirecting to dashboard');
        
        // DON'T call refreshTenant - let TenantContext's onAuthStateChange handle it naturally
        // Calling it here causes getUser() to hang because session isn't fully established
        
        // Redirect immediately
        router.push('/');
        
        // Clear submitting state immediately after redirect
        setIsSubmitting(false);
        return;
      }

      setError('Sign-in succeeded but session was not established. Please try again.');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);

    if (!email.trim()) {
      setValidationErrors({ email: 'Email is required' });
      return;
    }

    setIsResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email.');
      } else {
        setResetMessage('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to send reset email. Please try again.');
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
              <line x1="100" y1="50" x2="150" y2="150" className="stroke-blue-600" strokeWidth="2" />
              <line x1="50" y1="150" x2="150" y2="150" className="stroke-blue-600" strokeWidth="2" />
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
                0%, 100% { opacity: 0.6; filter: brightness(1); }
                50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 4px currentColor); }
              }
              .dot-1 { animation: shine 3s ease-in-out infinite; animation-delay: 0s; }
              .dot-2 { animation: shine 3s ease-in-out infinite; animation-delay: 1s; }
              .dot-3 { animation: shine 3s ease-in-out infinite; animation-delay: 2s; }
            `}</style>
            <svg viewBox="0 0 24 24" className="w-16 h-16">
              <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
              <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
              <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
              <line x1="12" y1="6" x2="7" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="12" y1="6" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="7" y1="16" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
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
          
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
              onClick={() => {
                setShowReset((prev) => !prev);
                setResetMessage(null);
                setError(null);
              }}
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
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Sending…' : 'Send reset email'}
                </button>
              </div>
            </form>
          )}

          {resetMessage && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
              {resetMessage}
            </div>
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
