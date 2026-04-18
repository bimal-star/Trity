/**
 * Data Sanitization Utilities
 * 
 * This module provides input sanitization helpers using DOMPurify.
 * These are isolated utilities that can be integrated into forms as needed.
 * 
 * @module lib/sanitization
 * @requires dompurify
 * @requires isomorphic-dompurify
 */

import DOMPurify from 'isomorphic-dompurify';

type DOMPurifyConfig = Parameters<typeof DOMPurify.setConfig>[0];

/**
 * Sanitize HTML content - removes all HTML tags and dangerous content
 * Suitable for plain text inputs
 * 
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string with all HTML removed
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize HTML content - allows safe HTML tags
 * Suitable for rich text inputs
 * 
 * @param {string} input - The HTML string to sanitize
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize URL - ensures URL is safe
 * Removes javascript:, data:, and other dangerous protocols
 * 
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove any whitespace
  url = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(url)) {
    return '';
  }

  // Allow only http, https, mailto, tel
  const safeProtocols = /^(https?|mailto|tel):/i;
  
  // If it has a protocol, ensure it's safe
  if (url.includes(':') && !safeProtocols.test(url)) {
    return '';
  }

  return DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize email address
 * Basic validation and sanitization
 * 
 * @param {string} email - The email to sanitize
 * @returns {string} Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remove whitespace
  email = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }

  return DOMPurify.sanitize(email, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize filename - removes path traversal attempts and dangerous characters
 * 
 * @param {string} filename - The filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path separators and null bytes
  let sanitized = filename.replace(/[\/\\:\0]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

  // Remove any remaining dangerous characters
  sanitized = sanitized.replace(/[<>"|?*]/g, '');

  return sanitized;
}

/**
 * Sanitize JSON string - validates and sanitizes JSON input
 * 
 * @param {string} jsonString - The JSON string to sanitize
 * @returns {string} Valid JSON string or '{}'
 */
export function sanitizeJSON(jsonString: string): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }

  try {
    // Parse to validate
    const parsed = JSON.parse(jsonString);
    
    // Re-stringify to ensure clean JSON
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Invalid JSON provided:', error);
    return '{}';
  }
}

/**
 * Sanitize SQL-like input - removes common SQL injection patterns
 * Note: Always use parameterized queries. This is a secondary defense layer.
 * 
 * @param {string} input - The input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeSQLInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove SQL comments
  let sanitized = input.replace(/--[^\n]*/g, '');
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove common SQL keywords in dangerous positions
  const dangerousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s+/gi,
    /UNION\s+SELECT/gi,
    /OR\s+1\s*=\s*1/gi,
    /'\s*OR\s*'[^']*'\s*=\s*'/gi,
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

/**
 * Sanitize object - recursively sanitize all string properties
 * 
 * @param {any} obj - The object to sanitize
 * @param {Function} sanitizer - The sanitization function to use (default: sanitizeText)
 * @returns {any} Sanitized object
 */
export function sanitizeObject(
  obj: any,
  sanitizer: (input: string) => string = sanitizeText
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizer(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sanitizer));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], sanitizer);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Configure DOMPurify with custom settings
 * 
 * @param {object} config - Custom DOMPurify configuration
 */
export function configureDOMPurify(config: DOMPurifyConfig): void {
  DOMPurify.setConfig(config);
}

/**
 * Add custom hook to DOMPurify
 * 
 * @param {string} hookName - The hook name (e.g., 'afterSanitizeAttributes')
 * @param {Function} hookFunction - The hook function
 */
export function addDOMPurifyHook(
  hookName: string,
  hookFunction: (currentNode: Element, data: any, config: DOMPurifyConfig) => void
): void {
  DOMPurify.addHook(hookName as any, hookFunction);
}

/**
 * Sanitization profiles for different contexts
 */
export const SanitizationProfiles = {
  STRICT: sanitizeText,
  HTML: sanitizeHTML,
  URL: sanitizeURL,
  EMAIL: sanitizeEmail,
  FILENAME: sanitizeFilename,
  JSON: sanitizeJSON,
  SQL: sanitizeSQLInput,
};

/**
 * Batch sanitize multiple inputs
 * 
 * @param {object} inputs - Object with key-value pairs to sanitize
 * @param {string} profile - Sanitization profile to use (default: 'STRICT')
 * @returns {object} Object with sanitized values
 */
export function batchSanitize(
  inputs: Record<string, string>,
  profile: keyof typeof SanitizationProfiles = 'STRICT'
): Record<string, string> {
  const sanitizer = SanitizationProfiles[profile];
  const result: Record<string, string> = {};

  for (const key in inputs) {
    if (inputs.hasOwnProperty(key)) {
      result[key] = sanitizer(inputs[key]);
    }
  }

  return result;
}
