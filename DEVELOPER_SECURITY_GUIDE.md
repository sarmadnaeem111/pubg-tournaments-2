# Security Guide for PUBG Tournaments Developers

## Introduction

This guide provides security best practices for developers working on the PUBG Tournaments application. Following these guidelines will help maintain a secure codebase and protect user data.

## Authentication & Authorization

### User Authentication

- Always use the `AuthContext` for authentication operations
- Never store passwords or tokens in client-side code
- Use the enhanced login/signup components with CSRF protection
- Implement proper validation for all authentication inputs
- Use the provided Google authentication method for OAuth sign-in

```javascript
// CORRECT: Using AuthContext for authentication
import { useAuth } from '../../contexts/AuthContext';

function LoginComponent() {
  const { login, loginWithGoogle } = useAuth();
  // For email/password login
  const handleEmailLogin = async () => {
    await login(email, password);
  }
  
  // For Google login
  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  }
  // ...
}

// INCORRECT: Direct Firebase authentication
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function UnsafeLogin() {
  const auth = getAuth();
  // Unsafe direct authentication
  signInWithEmailAndPassword(auth, email, password);
  
  // Unsafe direct Google authentication
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider);
  // ...
}
```

### Role-Based Access Control

- Always use `ProtectedRoute` for routes requiring authentication
- Set `requireAdmin={true}` for admin-only routes
- Validate user roles on both client and server side

```javascript
// CORRECT: Using ProtectedRoute with admin requirement
<Route 
  path="/admin/users" 
  element={
    <ProtectedRoute requireAdmin={true}>
      <UserManagement />
    </ProtectedRoute>
  } 
/>

// INCORRECT: Unprotected admin route
<Route path="/admin/users" element={<UserManagement />} />
```

## Data Security

### Input Sanitization

- Always use the `sanitizeInput()` function from `utils/security.js` for user inputs
- Validate all inputs with appropriate validation functions
- Use `FormValidator` component for form validation

```javascript
// CORRECT: Using sanitization and validation
import { sanitizeInput, validateEmail } from '../../utils/security';

const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
if (!validateEmail(sanitizedEmail)) {
  setError('Invalid email format');
  return;
}

// INCORRECT: Using raw user input
const userEmail = email;
// Directly using userEmail without sanitization or validation
```

### Firestore Security

- Use `securityMiddleware.js` functions for Firestore operations
- Always validate permissions before database operations
- Sanitize data before writing to Firestore

```javascript
// CORRECT: Using security middleware
import { validateUserPermission, sanitizeFirestoreData } from '../firebase/securityMiddleware';

async function updateUserData(userId, data) {
  // Check permissions
  const hasPermission = await validateUserPermission(
    currentUser.uid, 
    userId, 
    'user', 
    'update'
  );
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // Sanitize data
  const sanitizedData = sanitizeFirestoreData(data);
  
  // Update document
  return updateDoc(doc(db, 'users', userId), sanitizedData);
}

// INCORRECT: Direct Firestore update without permission check
function unsafeUpdate(userId, data) {
  return updateDoc(doc(db, 'users', userId), data);
}
```

## CSRF Protection

- Include `<CSRFToken />` in all forms
- Validate CSRF tokens on form submission

```javascript
// CORRECT: Form with CSRF protection
<Form onSubmit={handleSubmit}>
  <CSRFToken />
  {/* Form fields */}
</Form>

// In submission handler:
const form = e.target;
const csrfToken = form.elements.csrf_token.value;
if (!validateCSRFToken(csrfToken)) {
  setError('Security validation failed');
  return;
}
```

## Environment Variables

- Never hardcode sensitive information
- Use environment variables for all configuration
- Follow the pattern in `.env.example`

```javascript
// CORRECT: Using environment variables
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;

// INCORRECT: Hardcoded credentials
const apiKey = 'AIzaSyC1a2b3c4d5e6f7g8h9i0j';
```

## XSS Prevention

- Never use `dangerouslySetInnerHTML` without sanitization
- Use DOMPurify for any HTML content
- Avoid template literals in JSX without proper escaping

```javascript
// CORRECT: Using DOMPurify for HTML content
import DOMPurify from 'dompurify';

function SafeHTML({ content }) {
  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: DOMPurify.sanitize(content) 
      }} 
    />
  );
}

// INCORRECT: Unsafe HTML rendering
function UnsafeHTML({ content }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

## Session Management

- Use the enhanced `ProtectedRoute` component for session management
- Implement proper session timeout handling
- Track user activity for session management

## Security Testing

- Run `npm run security-audit` regularly
- Address all issues found in the audit
- Run `npm run npm-audit` to check for vulnerable dependencies
- Use `npm run lint` to check for security issues in code

## Reporting Security Issues

If you discover a security vulnerability, please report it by sending an email to security@pubgtournaments.com. Do not disclose security vulnerabilities publicly until they have been addressed by the maintainers.

---

## Security Checklist for Pull Requests

Before submitting a pull request, ensure that:

- [ ] All user inputs are sanitized
- [ ] All forms include CSRF protection
- [ ] No sensitive information is hardcoded
- [ ] Proper authentication checks are in place
- [ ] Firestore security rules are followed
- [ ] No XSS vulnerabilities are introduced
- [ ] Security audit passes without new issues
- [ ] ESLint security rules pass

---

Last updated: 2024