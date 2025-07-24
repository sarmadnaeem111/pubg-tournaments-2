import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, ListGroup, Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';
import CSRFToken from '../security/CSRFToken';
import { useNavigate } from 'react-router-dom';
import RechargeModal from './RechargeModal';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser, getUserData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserData() {
      if (currentUser) {
        try {
          const data = await getUserData(currentUser.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchUserData();
  }, [currentUser, getUserData]);
  


  if (loading) {
    return <Container className="py-5"><p>Loading profile...</p></Container>;
  }

  return (
    <>
      <Container className="py-4 px-3 px-md-5">
        <h1 className="mb-4 fs-2">My Profile</h1>
        
        <Row className="gy-4">
          <Col xs={12} md={4} className="mb-md-4">
            <Card className="h-100">
              <Card.Body>
                <div className="text-center mb-3">
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto" 
                    style={{ width: '80px', height: '80px', fontSize: '2rem' }}
                  >
                    {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                
                <Card.Title className="text-center fs-5">{currentUser?.email}</Card.Title>
                <Card.Text className="text-center text-muted">
                  <Badge bg="secondary">{userData?.role || 'User'}</Badge>
                </Card.Text>
                
                <ListGroup variant="flush" className="mt-3">
                  <ListGroup.Item className="d-flex justify-content-between align-items-center py-2">
                    <span className="small">Wallet Balance</span>
                    <span className="text-success fw-bold">Rs. {userData?.walletBalance || 0}</span>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center py-2">
                    <span className="small">Joined Tournaments</span>
                    <span>{userData?.joinedTournaments?.length || 0}</span>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center py-2">
                    <span className="small">Account Created</span>
                    <span className="small">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} md={8}>
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0 fs-5">Account Information</h5>
              </Card.Header>
              <Card.Body>
                <Row className="gy-2">
                  <Col xs={12} md={6} className="mb-3">
                    <h6 className="fs-6">Email Address</h6>
                    <p className="small">{currentUser?.email}</p>
                  </Col>
                  <Col xs={12} md={6} className="mb-3">
                    <h6 className="fs-6">User ID</h6>
                    <p className="text-muted small text-truncate">{currentUser?.uid}</p>
                  </Col>
                </Row>
                
                <hr />
                
                <h6 className="fs-6">Wallet Information</h6>
                <p className="small">
                  Your current balance is <strong className="text-success">Rs. {userData?.walletBalance || 0}</strong>.
                  This balance can be used to join tournaments.
                </p>
                
                <div className="d-flex mt-3 flex-wrap gap-2">
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    className="me-2 mb-2"
                    onClick={() => setShowRechargeModal(true)}
                  >
                    Recharge Wallet
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="me-2 mb-2"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={!userData?.walletBalance || userData?.walletBalance <= 0}
                  >
                    Withdraw Funds
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    size="sm"
                    className="me-2 mb-2"
                    onClick={() => navigate('/recharge-history')}
                  >
                    Recharge History
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    size="sm"
                    className="mb-2"
                    onClick={() => navigate('/withdrawal-history')}
                  >
                    Withdraw History
                  </Button>
                </div>
                
                <hr />
                
                <h6 className="fs-6">Tournament History</h6>
                {userData?.joinedTournaments?.length > 0 ? (
                  <p className="small">You have joined {userData.joinedTournaments.length} tournaments. View details in the My Tournaments section.</p>
                ) : (
                  <p className="small">You haven&apos;t joined any tournaments yet. Check out the Tournaments section to find and join upcoming events.</p>
                )}
                

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      
      {/* Withdraw Modal */}
      <Modal show={showWithdrawModal} onHide={() => setShowWithdrawModal(false)} centered className="responsive-modal">
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Withdraw Funds</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-3 py-3">
          {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
          {success && <Alert variant="success" className="p-2 small">{success}</Alert>}
          
          <Form>
            <CSRFToken />
            
            <Form.Group className="mb-3">
              <Form.Label className="small">Available Balance</Form.Label>
              <Form.Control 
                type="text" 
                value={`Rs. ${userData?.walletBalance || 0}`} 
                disabled 
                className="form-control-sm"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="small">Account Owner Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Enter account owner name" 
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required 
                className="form-control-sm"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="small">Bank Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Enter bank name" 
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required 
                className="form-control-sm"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="small">Account Number</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Enter account number" 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required 
                className="form-control-sm"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="small">Withdrawal Amount (Rs.)</Form.Label>
              <Form.Control 
                type="number" 
                placeholder="Enter amount to withdraw" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="1"
                max={userData?.walletBalance || 0}
                required 
                className="form-control-sm"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="px-3 py-2 d-flex justify-content-between">
          <Button variant="secondary" onClick={() => setShowWithdrawModal(false)} size="sm" className="px-3">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleWithdrawRequest}
            disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > userData?.walletBalance || !accountName || !accountNumber || !bankName}
            size="sm"
            className="px-3"
          >
            Submit Request
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Recharge Modal */}
      <RechargeModal 
        show={showRechargeModal} 
        onHide={() => setShowRechargeModal(false)} 
        currentUser={currentUser}
        onSuccess={() => {
          // Refresh user data after successful recharge request
          if (currentUser) {
            getUserData(currentUser.uid).then(data => setUserData(data));
          }
        }}
      />
    </>
  );
  
  async function handleWithdrawRequest() {
    if (!currentUser) return;
    
    try {
      // Validate inputs
      if (!withdrawAmount || withdrawAmount <= 0) {
        setError('Please enter a valid withdrawal amount');
        return;
      }
      
      if (withdrawAmount > userData?.walletBalance) {
        setError('Withdrawal amount cannot exceed your balance');
        return;
      }
      
      if (!accountName || !accountNumber || !bankName) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Sanitize inputs
      const sanitizedAccountName = sanitizeInput(accountName);
      const sanitizedAccountNumber = sanitizeInput(accountNumber);
      const sanitizedBankName = sanitizeInput(bankName);
      const amount = parseFloat(withdrawAmount);
      
      // Create withdrawal request in Firestore
      await addDoc(collection(db, 'withdrawalRequests'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        accountName: sanitizedAccountName,
        accountNumber: sanitizedAccountNumber,
        bankName: sanitizedBankName,
        amount: amount,
        status: 'pending',
        requestDate: new Date().toISOString(),
        processedDate: null,
        notes: ''
      });
      
      // Show success message
      setSuccess('Withdrawal request submitted successfully. The admin will review your request.');
      
      // Reset form
      setWithdrawAmount('');
      setAccountName('');
      setAccountNumber('');
      setBankName('');
      setError('');
      
      // No need to refresh withdrawal history here as we'll redirect to the history page
      
      // Close modal after a delay and redirect to withdrawal history
      setTimeout(() => {
        setShowWithdrawModal(false);
        setSuccess('');
        navigate('/withdrawal-history'); // Redirect to withdrawal history page
      }, 3000);
      
    } catch (error) {
      setError('Failed to submit withdrawal request: ' + error.message);
    }
  }
}

export default UserProfile;