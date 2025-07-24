import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Badge, Image } from 'react-bootstrap';
import { collection, getDocs, doc, updateDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';

function RechargeManagement() {
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch recharge requests on component mount
  useEffect(() => {
    fetchRechargeRequests();
  }, []);

  async function fetchRechargeRequests() {
    try {
      setLoading(true);
      const rechargeCollection = collection(db, 'rechargeRequests');
      
      try {
        // Try with orderBy first (requires index)
        const rechargeQuery = query(rechargeCollection, orderBy('requestDate', 'desc'));
        const rechargeSnapshot = await getDocs(rechargeQuery);
        const rechargeList = rechargeSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRechargeRequests(rechargeList);
      } catch (indexError) {
        // If index error occurs, fall back to a simpler query
        console.log('Index error, falling back to simpler query:', indexError);
        
        // Fallback query without orderBy
        const fallbackQuery = query(rechargeCollection);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackList = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort the results in memory instead
        fallbackList.sort((a, b) => {
          return new Date(b.requestDate) - new Date(a.requestDate); // desc order
        });
        
        setRechargeRequests(fallbackList);
      }
    } catch (error) {
      // Check if it's an index error
      if (error.message && error.message.includes('index')) {
        setError('The recharge requests list requires a database index. Please create it using the Firebase console.');
      } else {
        setError('Failed to fetch recharge requests: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function openRequestModal(request) {
    setCurrentRequest(request);
    setAdminNotes(request.notes || '');
    setShowModal(true);
  }

  async function handleApproveRequest() {
    if (!currentRequest) return;

    try {
      // Update the recharge request status
      const requestRef = doc(db, 'rechargeRequests', currentRequest.id);
      await updateDoc(requestRef, {
        status: 'approved',
        processedDate: new Date().toISOString(),
        notes: sanitizeInput(adminNotes)
      });
      
      // Update user's wallet balance
      const userRef = doc(db, 'users', currentRequest.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentBalance = userData.walletBalance || 0;
        const newBalance = currentBalance + Number(currentRequest.amount);
        
        await updateDoc(userRef, {
          walletBalance: newBalance,
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Show success message and refresh the list
      setSuccess('Recharge request approved successfully');
      fetchRechargeRequests();
      setShowModal(false);
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to approve recharge request: ' + error.message);
    }
  }

  async function handleRejectRequest() {
    if (!currentRequest) return;

    try {
      // Update the recharge request status
      const requestRef = doc(db, 'rechargeRequests', currentRequest.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        processedDate: new Date().toISOString(),
        notes: sanitizeInput(adminNotes)
      });
      
      // Show success message and refresh the list
      setSuccess('Recharge request rejected successfully');
      fetchRechargeRequests();
      setShowModal(false);
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to reject recharge request: ' + error.message);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'pending': return <Badge bg="warning">Pending</Badge>;
      case 'approved': return <Badge bg="success">Approved</Badge>;
      case 'rejected': return <Badge bg="danger">Rejected</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Recharge Requests Management</h1>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      {error && error.includes('index') && (
        <Alert variant="info" className="mt-2">
          <p><strong>Admin Note:</strong> This feature requires a Firestore index. Please create it:</p>
          <a href="https://console.firebase.google.com/v1/r/project/customer-abe40/firestore/indexes?create_composite=Cldwcm9qZWN0cy9jdXN0b21lci1hYmU0MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcmVjaGFyZ2VSZXF1ZXN0cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoPCgtyZXF1ZXN0RGF0ZRACGgwKCF9fbmFtZV9fEAI" 
             target="_blank" 
             rel="noopener noreferrer"
             className="btn btn-sm btn-outline-primary mt-2">
            Create Firestore Index
          </a>
          <p className="mt-2 small text-muted">The application will continue to function with limited sorting capabilities until the index is created.</p>
        </Alert>
      )}
      
      {loading ? (
        <p>Loading recharge requests...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Transaction ID</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Payment Proof</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rechargeRequests.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">No recharge requests found</td>
              </tr>
            ) : (
              rechargeRequests.map(request => (
                <tr key={request.id}>
                  <td>{request.userEmail}</td>
                  <td>Rs. {request.amount}</td>
                  <td>{request.paymentMethod}</td>
                  <td>{request.transactionId}</td>
                  <td>{new Date(request.requestDate).toLocaleDateString()}</td>
                  <td>{getStatusBadge(request.status)}</td>
                  <td>
                    {request.proofImageUrl ? (
                      <Image 
                        src={request.proofImageUrl} 
                        width="40" 
                        height="40" 
                        thumbnail 
                        style={{ cursor: 'pointer' }}
                        onClick={() => window.open(request.proofImageUrl, '_blank')}
                        alt="Payment Proof"
                      />
                    ) : (
                      <span className="text-muted">No image</span>
                    )}
                  </td>
                  <td>
                    {request.status === 'pending' ? (
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => openRequestModal(request)}
                      >
                        Process
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => openRequestModal(request)}
                      >
                        View Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
      
      {/* Process Recharge Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentRequest?.status === 'pending' ? 'Process Recharge Request' : 'Recharge Request Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentRequest && (
            <>
              <div className="mb-4">
                <h5>Request Details</h5>
                <Table bordered size="sm">
                  <tbody>
                    <tr>
                      <th>User</th>
                      <td>{currentRequest.userEmail}</td>
                    </tr>
                    <tr>
                      <th>Amount</th>
                      <td>Rs. {currentRequest.amount}</td>
                    </tr>
                    <tr>
                      <th>Payment Method</th>
                      <td>{currentRequest.paymentMethod}</td>
                    </tr>
                    <tr>
                      <th>Transaction ID</th>
                      <td>{currentRequest.transactionId}</td>
                    </tr>
                    <tr>
                      <th>Request Date</th>
                      <td>{new Date(currentRequest.requestDate).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>{getStatusBadge(currentRequest.status)}</td>
                    </tr>
                    {currentRequest.processedDate && (
                      <tr>
                        <th>Processed Date</th>
                        <td>{new Date(currentRequest.processedDate).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              
              {currentRequest.proofImageUrl && (
                <div className="mb-4">
                  <h5>Payment Proof</h5>
                  <div className="text-center">
                    <Image 
                      src={currentRequest.proofImageUrl} 
                      alt="Payment Proof" 
                      thumbnail 
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                </div>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Admin Notes</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  disabled={currentRequest.status !== 'pending'}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          
          {currentRequest?.status === 'pending' && (
            <>
              <Button 
                variant="danger" 
                onClick={handleRejectRequest}
              >
                Reject
              </Button>
              <Button 
                variant="success" 
                onClick={handleApproveRequest}
              >
                Approve
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default RechargeManagement;