import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CSRFToken from '../security/CSRFToken';
import FormValidator from '../security/FormValidator';
import { sanitizeInput, validateCSRFToken } from '../../utils/security';
import GoogleSignInButton from './GoogleSignInButton';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Check for account lockout on component mount
  useEffect(() => {
    const storedLockout = localStorage.getItem('accountLockout');
    if (storedLockout) {
      const lockoutData = JSON.parse(storedLockout);
      const now = new Date().getTime();
      
      if (now < lockoutData.until) {
        setLockoutUntil(new Date(lockoutData.until));
      } else {
        // Lockout period has expired
        localStorage.removeItem('accountLockout');
      }
    }
    
    // Reset login attempts after 30 minutes of inactivity
    const storedAttempts = localStorage.getItem('loginAttempts');
    if (storedAttempts) {
      const attemptsData = JSON.parse(storedAttempts);
      const now = new Date().getTime();
      
      if (now - attemptsData.timestamp > 30 * 60 * 1000) {
        // Reset after 30 minutes
        localStorage.removeItem('loginAttempts');
      } else {
        setLoginAttempts(attemptsData.count);
      }
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Check if account is locked out
    if (lockoutUntil) {
      const now = new Date().getTime();
      if (now < lockoutUntil.getTime()) {
        const minutesLeft = Math.ceil((lockoutUntil.getTime() - now) / 60000);
        setError(`Account is temporarily locked. Please try again in ${minutesLeft} minute(s).`);
        return;
      } else {
        // Lockout period has expired
        setLockoutUntil(null);
        localStorage.removeItem('accountLockout');
      }
    }
    
    // Validate CSRF token
    const form = e.target;
    const csrfToken = form.elements.csrf_token.value;
    if (!validateCSRFToken(csrfToken)) {
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
    
    try {
      setError('');
      setLoading(true);
      
      // Track login attempts
      const newAttemptCount = loginAttempts + 1;
      setLoginAttempts(newAttemptCount);
      
      // Store login attempts in localStorage
      localStorage.setItem('loginAttempts', JSON.stringify({
        count: newAttemptCount,
        timestamp: new Date().getTime()
      }));
      
      // If too many failed attempts, lock the account temporarily
      if (newAttemptCount >= 5) {
        const lockoutTime = new Date();
        lockoutTime.setMinutes(lockoutTime.getMinutes() + 15); // 15 minute lockout
        
        setLockoutUntil(lockoutTime);
        localStorage.setItem('accountLockout', JSON.stringify({
          until: lockoutTime.getTime()
        }));
        
        setError('Too many failed login attempts. Your account is locked for 15 minutes.');
        setLoading(false);
        return;
      }
      
      await login(sanitizedEmail, password);
      
      // Reset login attempts on successful login
      setLoginAttempts(0);
      localStorage.removeItem('loginAttempts');
      
      navigate('/');
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Log In</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <CSRFToken />
              <FormValidator>
                {({ validateEmailField, validateRequired, errors }) => (
                  <>
                    <Form.Group id="email" className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control 
                        type="email" 
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          validateEmailField(e.target.value);
                        }}
                        onBlur={() => validateEmailField(email)}
                        isInvalid={errors.email}
                        required 
                      />
                      {errors.email && (
                        <Form.Control.Feedback type="invalid">
                          {errors.email}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Form.Group id="password" className="mb-3">
                      <Form.Label>Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          validateRequired(e.target.value, 'Password');
                        }}
                        onBlur={() => validateRequired(password, 'Password')}
                        isInvalid={errors.Password}
                        required 
                      />
                      {errors.Password && (
                        <Form.Control.Feedback type="invalid">
                          {errors.Password}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    <Button 
                      disabled={loading || lockoutUntil !== null} 
                      className="w-100" 
                      type="submit"
                    >
                      {loading ? 'Logging in...' : 'Log In'}
                    </Button>
                  </>
                )}
              </FormValidator>
            </Form>
            <div className="text-center mt-3">
              <div className="d-flex align-items-center mb-3">
                <hr className="flex-grow-1" />
                <span className="mx-2 text-muted">OR</span>
                <hr className="flex-grow-1" />
              </div>
              <GoogleSignInButton className="w-100" />
            </div>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Need an account? <Link to="/signup">Sign Up</Link>
        </div>
        <div className="w-100 text-center mt-2">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
        <div className="w-100 text-center mt-2">
          <Link to="/email-verification-help">Not receiving emails?</Link>
        </div>
      </div>
    </Container>
  );
}

export default Login;