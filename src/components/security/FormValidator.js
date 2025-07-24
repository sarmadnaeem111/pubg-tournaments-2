import React from 'react';
import { validateEmail, validatePassword, sanitizeInput } from '../../utils/security';

/**
 * Form validation component that provides validation functions and error messages
 * @param {Object} props - Component props
 * @param {Function} props.children - Render prop function that receives validation utilities
 */
function FormValidator({ children }) {
  // Validation state
  const [errors, setErrors] = React.useState({});
  
  /**
   * Validates an email field
   * @param {string} email - The email to validate
   * @param {string} fieldName - The name of the field (for error messages)
   * @returns {boolean} - Whether the email is valid
   */
  const validateEmailField = (email, fieldName = 'email') => {
    const sanitizedEmail = sanitizeInput(email);
    const isValid = validateEmail(sanitizedEmail);
    
    if (!isValid) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Please enter a valid email address'
      }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    return true;
  };
  
  /**
   * Validates a password field
   * @param {string} password - The password to validate
   * @param {string} fieldName - The name of the field (for error messages)
   * @returns {boolean} - Whether the password is valid
   */
  const validatePasswordField = (password, fieldName = 'password') => {
    const isValid = validatePassword(password);
    
    if (!isValid) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol'
      }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    return true;
  };
  
  /**
   * Validates that two fields match (e.g., password and confirm password)
   * @param {string} value1 - The first value
   * @param {string} value2 - The second value
   * @param {string} fieldName - The name of the field (for error messages)
   * @returns {boolean} - Whether the values match
   */
  const validateFieldsMatch = (value1, value2, fieldName = 'confirmPassword') => {
    const isValid = value1 === value2;
    
    if (!isValid) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Fields do not match'
      }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    return true;
  };
  
  /**
   * Validates that a field is not empty
   * @param {string} value - The value to check
   * @param {string} fieldName - The name of the field (for error messages)
   * @returns {boolean} - Whether the field is not empty
   */
  const validateRequired = (value, fieldName) => {
    const sanitizedValue = sanitizeInput(value);
    const isValid = sanitizedValue && sanitizedValue.trim() !== '';
    
    if (!isValid) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: `${fieldName} is required`
      }));
      return false;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    return true;
  };
  
  /**
   * Sanitizes all form inputs
   * @param {Object} formData - The form data to sanitize
   * @returns {Object} - The sanitized form data
   */
  const sanitizeFormData = (formData) => {
    const sanitized = {};
    
    Object.keys(formData).forEach(key => {
      sanitized[key] = sanitizeInput(formData[key]);
    });
    
    return sanitized;
  };
  
  /**
   * Checks if the form has any validation errors
   * @returns {boolean} - Whether the form has errors
   */
  const hasErrors = () => Object.keys(errors).length > 0;
  
  // Provide validation utilities to children
  return children({
    errors,
    setErrors,
    validateEmailField,
    validatePasswordField,
    validateFieldsMatch,
    validateRequired,
    sanitizeFormData,
    hasErrors
  });
}

export default FormValidator;