import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CSRFToken from '../security/CSRFToken';
import FormValidator from '../security/FormValidator';
import { sanitizeInput } from '../../utils/security';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    // Sanitize input
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(sanitizedEmail);
      setMessage('Password reset instructions sent! Please check your email inbox (and spam/junk folder) for instructions to reset your password.');
    } catch (error) {
      setError('Failed to reset password: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Password Reset</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            <Form onSubmit={handleSubmit}>
              <CSRFToken />
              <FormValidator>
                {({ validateEmailField, errors }) => (
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
                    <Button 
                      disabled={loading} 
                      className="w-100" 
                      type="submit"
                    >
                      {loading ? 'Processing...' : 'Reset Password'}
                    </Button>
                  </>
                )}
              </FormValidator>
            </Form>
            <div className="w-100 text-center mt-3">
              <div className="d-flex justify-content-between">
                <Link to="/login">Back to Login</Link>
                <Link to="/email-verification-help">Not receiving emails?</Link>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}

export default ForgotPassword;