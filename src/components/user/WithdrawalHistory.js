import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Alert, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Link } from 'react-router-dom';

function WithdrawalHistory() {
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('requestDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchWithdrawalHistory() {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError('');
        
        // Fetch withdrawal requests for the current user
        const withdrawalRef = collection(db, 'withdrawalRequests');
        const withdrawalQuery = query(withdrawalRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(withdrawalQuery);
        
        // Process and sort the data
        let history = [];
        querySnapshot.forEach(doc => {
          history.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sort the history based on the current sort field and direction
        sortWithdrawalHistory(history, sortField, sortDirection);
        
        setWithdrawalHistory(history);
      } catch (err) {
        console.error('Error fetching withdrawal history:', err);
        setError('Failed to load withdrawal history. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchWithdrawalHistory();
  }, [currentUser, sortField, sortDirection]);
  
  // Function to sort withdrawal history
  const sortWithdrawalHistory = (history, field, direction) => {
    return history.sort((a, b) => {
      if (field === 'amount') {
        return direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else if (field === 'requestDate') {
        return direction === 'asc' 
          ? new Date(a.requestDate) - new Date(b.requestDate) 
          : new Date(b.requestDate) - new Date(a.requestDate);
      } else {
        // For string fields like status
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
  };
  
  // Handle sorting when a column header is clicked
  const handleSort = (field) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };
  
  // Function to render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <Container className="py-3 px-3 px-md-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center py-2 px-3">
          <h5 className="mb-0 fs-5">Withdrawal History</h5>
          <Link to="/profile">
            <Button variant="outline-primary" size="sm" className="px-2 py-1">Back to Profile</Button>
          </Link>
        </Card.Header>
        <Card.Body className="p-2 p-md-3">
          {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
          
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2 small">Loading withdrawal history...</p>
            </div>
          ) : withdrawalHistory.length > 0 ? (
            <div className="table-responsive">
              <Table striped bordered hover size="sm" className="small">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('requestDate')} style={{ cursor: 'pointer' }}>
                      Date {renderSortIndicator('requestDate')}
                    </th>
                    <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                      Amount {renderSortIndicator('amount')}
                    </th>
                    <th>Account Details</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      Status {renderSortIndicator('status')}
                    </th>
                    <th>Payment Proof</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalHistory.map(withdrawal => (
                    <tr key={withdrawal.id}>
                      <td>{new Date(withdrawal.requestDate).toLocaleDateString()} {new Date(withdrawal.requestDate).toLocaleTimeString()}</td>
                      <td>Rs. {withdrawal.amount}</td>
                      <td>
                        <div className="mb-1 small"><strong>Name:</strong> {withdrawal.accountName}</div>
                        <div className="mb-1 small"><strong>Bank:</strong> {withdrawal.bankName}</div>
                        <div className="small"><strong>Account:</strong> {withdrawal.accountNumber.substring(0, 4)}****</div>
                      </td>
                      <td>
                        <Badge bg={
                          withdrawal.status === 'approved' ? 'success' :
                          withdrawal.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        {withdrawal.proofImageUrl ? (
                          <a href={withdrawal.proofImageUrl} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={withdrawal.proofImageUrl} 
                              alt="Payment Proof" 
                              style={{ maxWidth: '60px', maxHeight: '60px', cursor: 'pointer' }} 
                              className="img-thumbnail"
                            />
                          </a>
                        ) : (
                          <small className="text-muted">No image</small>
                        )}
                      </td>
                      <td>
                        {withdrawal.notes ? (
                          <small>{withdrawal.notes}</small>
                        ) : (
                          <small className="text-muted">-</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info" className="p-2 small">
              You haven&apos;t made any withdrawal requests yet. 
              <Link to="/profile" className="ms-2">Go to your profile</Link> to make a withdrawal request.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default WithdrawalHistory;