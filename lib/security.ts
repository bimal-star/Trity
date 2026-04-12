/**
 * Security Utilities - CSRF Protection
 *
 * Helpers for classic form POST + cookie-session flows. They are not wired into
 * the JSON App Router APIs (`/api/ai/*`, `/api/access/*`), which authenticate
 * via `Authorization: Bearer <Supabase JWT>` from the same-origin SPA. That
 * pattern is not subject to the same cross-site cookie CSRF class as
 * cookie-based sessions; if you add cookie-only auth or form POST endpoints,
 * validate CSRF there or adopt double-submit / SameSite cookies as appropriate.
 *
 * @module lib/security
 */

import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} A random CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined') {
    // Client-side: Use Web Crypto API
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Server-side: Use Node.js crypto
    return randomBytes(32).toString('hex');
  }
}

/**
 * Store CSRF token in session storage (client-side only)
 * @param {string} token - The CSRF token to store
 */
export function storeCSRFToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrf_token', token);
  }
}

/**
 * Retrieve CSRF token from session storage (client-side only)
 * @returns {string | null} The stored CSRF token or null
 */
export function getStoredCSRFToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('csrf_token');
  }
  return null;
}

/**
 * Validate CSRF token against stored token
 * @param {string} token - The token to validate
 * @returns {boolean} True if token is valid, false otherwise
 */
export function validateCSRFToken(token: string): boolean {
  if (!token) {
    return false;
  }

  const storedToken = getStoredCSRFToken();
  if (!storedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(token, storedToken);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate and store a new CSRF token
 * Convenience function that combines generation and storage
 * @returns {string} The generated CSRF token
 */
export function initializeCSRFToken(): string {
  const token = generateCSRFToken();
  storeCSRFToken(token);
  return token;
}

/**
 * Clear stored CSRF token
 * Useful for logout or session invalidation
 */
export function clearCSRFToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('csrf_token');
  }
}

/**
 * Add CSRF token to form data
 * @param {FormData} formData - The form data object
 * @returns {FormData} The form data with CSRF token added
 */
export function addCSRFToFormData(formData: FormData): FormData {
  const token = getStoredCSRFToken();
  if (token) {
    formData.append('csrf_token', token);
  }
  return formData;
}

/**
 * Add CSRF token to request headers
 * @param {HeadersInit} headers - The request headers
 * @returns {HeadersInit} The headers with CSRF token added
 */
export function addCSRFToHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getStoredCSRFToken();
  if (token) {
    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  }
  return headers;
}

/**
 * Extract CSRF token from request headers
 * @param {Headers} headers - The request headers
 * @returns {string | null} The CSRF token or null
 */
export function getCSRFFromHeaders(headers: Headers): string | null {
  return headers.get('X-CSRF-Token');
}

/**
 * Extract CSRF token from form data
 * @param {FormData} formData - The form data
 * @returns {string | null} The CSRF token or null
 */
export function getCSRFFromFormData(formData: FormData): string | null {
  const token = formData.get('csrf_token');
  return typeof token === 'string' ? token : null;
}
