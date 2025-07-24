/**
 * Security utility functions for the application
 */
import DOMPurify from 'dompurify';
import validator from 'validator';
import CryptoJS from 'crypto-js';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - The user input to sanitize
 * @returns {string} - The sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input.trim());
  }
  return input;
}

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
export function validateEmail(email) {
  return validator.isEmail(email);
}

/**
 * Validates a password for strength requirements
 * @param {string} password - The password to validate
 * @returns {boolean} - Whether the password meets strength requirements
 */
export function validatePassword(password) {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });
}

/**
 * Encrypts sensitive data for local storage
 * @param {any} data - The data to encrypt
 * @param {string} key - The encryption key
 * @returns {string} - The encrypted data
 */
export function encryptData(data, key) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  return CryptoJS.AES.encrypt(dataStr, key).toString();
}

/**
 * Decrypts data from local storage
 * @param {string} encryptedData - The encrypted data
 * @param {string} key - The encryption key
 * @returns {any} - The decrypted data
 */
export function decryptData(encryptedData, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    try {
      // Try to parse as JSON
      return JSON.parse(decryptedData);
    } catch {
      // Return as string if not valid JSON
      return decryptedData;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Securely stores data in localStorage with encryption
 * @param {string} key - The storage key
 * @param {any} value - The value to store
 */
export function secureLocalStorage(key, value) {
  if (!key || value === undefined) return;
  
  try {
    // Use a consistent encryption key (in production, this would be more secure)
    const encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || 'PUBG_TOURNAMENTS_SECURE_KEY';
    const encryptedValue = encryptData(value, encryptionKey);
    localStorage.setItem(key, encryptedValue);
  } catch (error) {
    console.error('Error storing data securely:', error);
  }
}

/**
 * Retrieves and decrypts data from localStorage
 * @param {string} key - The storage key
 * @returns {any} - The decrypted value
 */
export function getSecureLocalStorage(key) {
  if (!key) return null;
  
  try {
    const encryptedValue = localStorage.getItem(key);
    if (!encryptedValue) return null;
    
    const encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || 'PUBG_TOURNAMENTS_SECURE_KEY';
    return decryptData(encryptedValue, encryptionKey);
  } catch (error) {
    console.error('Error retrieving secure data:', error);
    return null;
  }
}

/**
 * Removes secure data from localStorage
 * @param {string} key - The storage key to remove
 */
export function removeSecureLocalStorage(key) {
  if (!key) return;
  localStorage.removeItem(key);
}

/**
 * Generates a CSRF token for forms
 * @returns {string} - The generated CSRF token
 */
export function generateCSRFToken() {
  const token = CryptoJS.lib.WordArray.random(16).toString();
  secureLocalStorage('csrf_token', token);
  return token;
}

/**
 * Validates a CSRF token from a form submission
 * @param {string} token - The token to validate
 * @returns {boolean} - Whether the token is valid
 */
export function validateCSRFToken(token) {
  const storedToken = getSecureLocalStorage('csrf_token');
  return storedToken === token;
}