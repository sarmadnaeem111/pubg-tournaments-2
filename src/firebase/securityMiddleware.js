/**
 * Firebase Security Middleware
 * Provides enhanced security for Firebase operations
 */
import { db } from './config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { sanitizeInput } from '../utils/security';

/**
 * Validates user permissions for accessing a specific resource
 * @param {string} userId - The user ID requesting access
 * @param {string} resourceId - The resource ID being accessed
 * @param {string} resourceType - The type of resource (e.g., 'tournament', 'user')
 * @param {string} action - The action being performed (e.g., 'read', 'write', 'update', 'delete')
 * @returns {Promise<boolean>} - Whether the user has permission
 */
export async function validateUserPermission(userId, resourceId, resourceType, action) {
  if (!userId) return false;
  
  try {
    // Get user data to check role
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const userRole = userData.role || 'user';
    
    // Admin has all permissions
    if (userRole === 'admin') return true;
    
    // For user's own data
    if (resourceType === 'user' && resourceId === userId) {
      // Users can read and update their own data, but not delete
      return action === 'read' || action === 'update';
    }
    
    // For tournaments
    if (resourceType === 'tournament') {
      // Anyone can read tournaments
      if (action === 'read') return true;
      
      // Check if user is a participant for update actions
      if (action === 'update') {
        const tournamentDocRef = doc(db, 'tournaments', resourceId);
        const tournamentDoc = await getDoc(tournamentDocRef);
        
        if (!tournamentDoc.exists()) return false;
        
        const tournamentData = tournamentDoc.data();
        const participants = tournamentData.participants || [];
        
        // User can update if they're a participant
        return participants.includes(userId);
      }
      
      // Only admins can create or delete tournaments (handled above)
      return false;
    }
    
    // Default deny
    return false;
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
}

/**
 * Sanitizes data before writing to Firestore
 * @param {Object} data - The data to sanitize
 * @returns {Object} - The sanitized data
 */
export function sanitizeFirestoreData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      // Sanitize array values
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      // Recursively sanitize nested objects, but not Date objects
      sanitized[key] = sanitizeFirestoreData(value);
    } else {
      // Keep other values as is
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Validates data before writing to Firestore
 * @param {Object} data - The data to validate
 * @param {string} collectionName - The collection the data will be written to
 * @returns {Object} - Object with isValid flag and errors array
 */
export function validateFirestoreData(data, collectionName) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid data format'] };
  }
  
  const errors = [];
  
  // Collection-specific validation
  switch (collectionName) {
    case 'users':
      if (data.email && typeof data.email === 'string') {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          errors.push('Invalid email format');
        }
      }
      
      // Role validation
      if (data.role && !['user', 'admin'].includes(data.role)) {
        errors.push('Invalid user role');
      }
      
      // Wallet balance validation
      if (data.walletBalance !== undefined && 
          (typeof data.walletBalance !== 'number' || data.walletBalance < 0)) {
        errors.push('Invalid wallet balance');
      }
      break;
      
    case 'tournaments':
      // Tournament name validation
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        errors.push('Tournament name is required');
      }
      
      // Entry fee validation
      if (data.entryFee !== undefined && 
          (typeof data.entryFee !== 'number' || data.entryFee < 0)) {
        errors.push('Invalid entry fee');
      }
      
      // Capacity validation
      if (data.capacity !== undefined && 
          (typeof data.capacity !== 'number' || data.capacity <= 0)) {
        errors.push('Invalid capacity');
      }
      
      // Status validation
      if (data.status && !['upcoming', 'live', 'completed', 'cancelled'].includes(data.status)) {
        errors.push('Invalid tournament status');
      }
      break;
      
    default:
      // Generic validation for other collections
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Secure wrapper for Firestore read operations
 * @param {string} collectionName - The collection to query
 * @param {Array} conditions - Query conditions (optional)
 * @param {string} userId - The user ID making the request
 * @returns {Promise<Array>} - The query results
 */
export async function secureFirestoreRead(collectionName, conditions = [], userId) {
  try {
    // Build query
    let q = collection(db, collectionName);
    
    if (conditions && conditions.length > 0) {
      conditions.forEach(condition => {
        if (condition.length === 3) {
          const [field, operator, value] = condition;
          q = query(q, where(field, operator, value));
        }
      });
    }
    
    // Execute query
    const querySnapshot = await getDocs(q);
    const results = [];
    
    // Process results
    querySnapshot.forEach(doc => {
      // For user collection, only return the user's own data unless admin
      if (collectionName === 'users') {
        const userData = doc.data();
        
        // Check if user is requesting their own data or is an admin
        if (doc.id === userId || userData.role === 'admin') {
          results.push({
            id: doc.id,
            ...doc.data()
          });
        }
      } else {
        // For other collections, return all data
        results.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Secure Firestore read error:', error);
    throw new Error('Failed to read data securely');
  }
}