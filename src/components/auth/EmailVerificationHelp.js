import React from 'react';
import { Card, Alert, ListGroup, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Component that provides help for email verification and password reset issues
 */
function EmailVerificationHelp() {
  const { currentUser, sendEmailVerification } = useAuth();

  const handleResendVerification = async () => {
    try {
      if (currentUser) {
        await sendEmailVerification(currentUser);
        alert('Verification email sent! Please check your inbox and spam folder.');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      alert('Error sending verification email. Please try again later.');
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">Email Verification & Password Reset Help</Card.Header>
      <Card.Body>
        <Alert variant="info">
          Having trouble receiving verification or password reset emails? Follow the steps below.
        </Alert>

        <ListGroup variant="flush" className="mb-3">
          <ListGroup.Item>
            <strong>1. Check your spam/junk folder</strong>
            <p className="mb-0 mt-1">
              Email providers sometimes filter these messages. Look for emails from
              &quot;no-reply@customer-abe40.firebaseapp.com&quot;.
            </p>
          </ListGroup.Item>

          <ListGroup.Item>
            <strong>2. Verify your email address</strong>
            <p className="mb-0 mt-1">
              Make sure you entered your email address correctly. Common mistakes include
              typos or using an old/inactive email address.
            </p>
          </ListGroup.Item>

          <ListGroup.Item>
            <strong>3. Add to safe senders</strong>
            <p className="mb-0 mt-1">
              Add &quot;no-reply@customer-abe40.firebaseapp.com&quot; to your contacts or safe senders list
              to ensure future emails are delivered to your inbox.
            </p>
          </ListGroup.Item>

          <ListGroup.Item>
            <strong>4. Wait a few minutes</strong>
            <p className="mb-0 mt-1">
              Email delivery can sometimes be delayed. Please wait 5-10 minutes before trying again.
            </p>
          </ListGroup.Item>

          <ListGroup.Item>
            <strong>5. Try a different email provider</strong>
            <p className="mb-0 mt-1">
              If you consistently have issues with one email provider (e.g., Gmail),
              consider using an alternative email address.
            </p>
          </ListGroup.Item>
        </ListGroup>

        {currentUser && !currentUser.emailVerified && (
          <Button 
            variant="primary" 
            onClick={handleResendVerification}
            className="mb-3"
          >
            Resend Verification Email
          </Button>
        )}

        <div className="d-flex justify-content-between">
          <Link to="/login" className="btn btn-outline-secondary">
            Back to Login
          </Link>
          <Link to="/forgot-password" className="btn btn-outline-primary">
            Reset Password
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

export default EmailVerificationHelp;