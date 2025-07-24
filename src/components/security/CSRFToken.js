import React, { useEffect, useState } from 'react';
import { generateCSRFToken } from '../../utils/security';

/**
 * Component that generates and provides a CSRF token for forms
 * This should be included in all forms to protect against CSRF attacks
 */
function CSRFToken() {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Generate a new CSRF token when the component mounts
    const token = generateCSRFToken();
    setCsrfToken(token);
  }, []);

  return (
    <input 
      type="hidden" 
      name="csrf_token" 
      value={csrfToken} 
      data-testid="csrf-token-field"
    />
  );
}

export default CSRFToken;