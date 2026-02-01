/**
 * Enhanced Validation Utilities
 * 
 * This module provides improved validation patterns and helpers.
 * These are isolated utilities that can be integrated into forms as needed.
 * 
 * @module lib/validation
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Enhanced email validation with strict RFC compliance
 * @param {string} email - The email address to validate
 * @returns {ValidationResult} Validation result with errors
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const trimmed = email.trim();

  // Length check
  if (trimmed.length > 254) {
    errors.push('Email is too long (max 254 characters)');
  }

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    errors.push('Invalid email format');
  }

  // Check for consecutive dots
  if (trimmed.includes('..')) {
    errors.push('Email cannot contain consecutive dots');
  }

  // Check for valid TLD
  const tldRegex = /\.[a-zA-Z]{2,}$/;
  if (!tldRegex.test(trimmed)) {
    errors.push('Email must have a valid top-level domain');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Strong password validation
 * @param {string} password - The password to validate
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation result with errors
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Length check
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (password.length > 128) {
    errors.push('Password is too long (max 128 characters)');
  }

  // Uppercase check
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Numbers check
  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special characters check
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common pattern');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * URL validation with protocol check
 * @param {string} url - The URL to validate
 * @param {string[]} allowedProtocols - Allowed protocols (default: ['http', 'https'])
 * @returns {ValidationResult} Validation result with errors
 */
export function validateURL(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): ValidationResult {
  const errors: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('URL is required');
    return { isValid: false, errors };
  }

  try {
    const urlObject = new URL(url);

    // Check protocol
    const protocol = urlObject.protocol.slice(0, -1); // Remove trailing colon
    if (!allowedProtocols.includes(protocol)) {
      errors.push(`URL protocol must be one of: ${allowedProtocols.join(', ')}`);
    }

    // Check for valid hostname
    if (!urlObject.hostname) {
      errors.push('URL must have a valid hostname');
    }

    // Check for suspicious patterns
    if (urlObject.hostname.includes('..') || urlObject.hostname.startsWith('.')) {
      errors.push('URL hostname contains invalid patterns');
    }

  } catch (error) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Phone number validation (international format)
 * @param {string} phone - The phone number to validate
 * @returns {ValidationResult} Validation result with errors
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone || typeof phone !== 'string') {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }

  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // International format with optional country code
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;

  if (!phoneRegex.test(cleaned)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Username validation
 * @param {string} username - The username to validate
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation result with errors
 */
export function validateUsername(
  username: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  const { minLength = 3, maxLength = 20, allowSpecialChars = false } = options;

  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  // Length checks
  if (username.length < minLength) {
    errors.push(`Username must be at least ${minLength} characters long`);
  }

  if (username.length > maxLength) {
    errors.push(`Username must be at most ${maxLength} characters long`);
  }

  // Character validation
  const basePattern = /^[a-zA-Z0-9_]+$/;
  const extendedPattern = /^[a-zA-Z0-9_\-\.]+$/;

  const pattern = allowSpecialChars ? extendedPattern : basePattern;

  if (!pattern.test(username)) {
    const allowed = allowSpecialChars
      ? 'letters, numbers, underscores, hyphens, and periods'
      : 'letters, numbers, and underscores';
    errors.push(`Username can only contain ${allowed}`);
  }

  // Must start with letter or number
  if (!/^[a-zA-Z0-9]/.test(username)) {
    errors.push('Username must start with a letter or number');
  }

  // Cannot end with special characters
  if (allowSpecialChars && /[_\-\.]$/.test(username)) {
    errors.push('Username cannot end with special characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Alphanumeric validation with custom pattern
 * @param {string} input - The input to validate
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation result with errors
 */
export function validateAlphanumeric(
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowSpaces?: boolean;
    allowDashes?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  const { minLength = 1, maxLength = 100, allowSpaces = false, allowDashes = false } = options;

  if (!input || typeof input !== 'string') {
    errors.push('Input is required');
    return { isValid: false, errors };
  }

  // Length checks
  if (input.length < minLength) {
    errors.push(`Input must be at least ${minLength} characters long`);
  }

  if (input.length > maxLength) {
    errors.push(`Input must be at most ${maxLength} characters long`);
  }

  // Build pattern based on options
  let pattern = '^[a-zA-Z0-9';
  if (allowSpaces) pattern += '\\s';
  if (allowDashes) pattern += '\\-';
  pattern += ']+$';

  const regex = new RegExp(pattern);

  if (!regex.test(input)) {
    let allowed = 'letters and numbers';
    if (allowSpaces) allowed += ', spaces';
    if (allowDashes) allowed += ', and dashes';
    errors.push(`Input can only contain ${allowed}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Date validation (ISO 8601 format)
 * @param {string} dateString - The date string to validate
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation result with errors
 */
export function validateDate(
  dateString: string,
  options: {
    minDate?: Date;
    maxDate?: Date;
    allowFuture?: boolean;
    allowPast?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  const { minDate, maxDate, allowFuture = true, allowPast = true } = options;

  if (!dateString || typeof dateString !== 'string') {
    errors.push('Date is required');
    return { isValid: false, errors };
  }

  // ISO 8601 date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(dateString)) {
    errors.push('Date must be in YYYY-MM-DD format');
    return { isValid: false, errors };
  }

  const date = new Date(dateString);

  // Check if valid date
  if (isNaN(date.getTime())) {
    errors.push('Invalid date');
    return { isValid: false, errors };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Future date check
  if (!allowFuture && date > now) {
    errors.push('Future dates are not allowed');
  }

  // Past date check
  if (!allowPast && date < now) {
    errors.push('Past dates are not allowed');
  }

  // Min date check
  if (minDate && date < minDate) {
    errors.push(`Date must be on or after ${minDate.toISOString().split('T')[0]}`);
  }

  // Max date check
  if (maxDate && date > maxDate) {
    errors.push(`Date must be on or before ${maxDate.toISOString().split('T')[0]}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Numeric validation with range checks
 * @param {string | number} input - The input to validate
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation result with errors
 */
export function validateNumber(
  input: string | number,
  options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
    allowNegative?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  const { min, max, allowDecimals = true, allowNegative = true } = options;

  if (input === null || input === undefined || input === '') {
    errors.push('Number is required');
    return { isValid: false, errors };
  }

  const num = typeof input === 'string' ? parseFloat(input) : input;

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    errors.push('Invalid number');
    return { isValid: false, errors };
  }

  // Decimal check
  if (!allowDecimals && num % 1 !== 0) {
    errors.push('Decimal numbers are not allowed');
  }

  // Negative check
  if (!allowNegative && num < 0) {
    errors.push('Negative numbers are not allowed');
  }

  // Range checks
  if (min !== undefined && num < min) {
    errors.push(`Number must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    errors.push(`Number must be at most ${max}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple fields at once
 * @param {object} fields - Object with field names and validation functions
 * @returns {object} Object with field names and validation results
 */
export function validateFields(
  fields: Record<string, () => ValidationResult>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const fieldName in fields) {
    if (fields.hasOwnProperty(fieldName)) {
      results[fieldName] = fields[fieldName]();
    }
  }

  return results;
}

/**
 * Check if all validation results are valid
 * @param {object} results - Validation results object
 * @returns {boolean} True if all validations passed
 */
export function isAllValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every(result => result.isValid);
}

/**
 * Get all error messages from validation results
 * @param {object} results - Validation results object
 * @returns {string[]} Array of all error messages
 */
export function getAllErrors(results: Record<string, ValidationResult>): string[] {
  return Object.values(results).flatMap(result => result.errors);
}
