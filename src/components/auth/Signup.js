import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from './GoogleSignInButton';
import CSRFToken from '../security/CSRFToken';
import { sanitizeInput } from '../../utils/security';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());

    try {
      setError('');
      setLoading(true);
      await signup(sanitizedEmail, password);
      navigate('/');
    } catch (error) {
      setError('Failed to create an account: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Sign Up</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <CSRFToken />
              <Form.Group id="email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </Form.Group>
              <Form.Group id="password" className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <Form.Text className="text-muted">
                  Password must be at least 8 characters with uppercase, lowercase, number, and symbol.
                </Form.Text>
              </Form.Group>
              <Form.Group id="password-confirm" className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </Form.Group>
              <Button disabled={loading} className="w-100" type="submit">
                Sign Up
              </Button>
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
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </Container>
  );
}

export default Signup;