import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Alert, Badge, Button, Spinner, Image } from 'react-bootstrap';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

function RechargeHistory() {
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('requestDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchRechargeHistory();
    }
  }, [currentUser, sortField, sortDirection]);

  async function fetchRechargeHistory() {
    try {
      setLoading(true);
      
      // Create query for user's recharge requests
      let rechargeQuery;
      try {
        // Try with the composite index first
        rechargeQuery = query(
          collection(db, 'rechargeRequests'),
          where('userId', '==', currentUser.uid),
          orderBy(sortField, sortDirection)
        );
        
        const querySnapshot = await getDocs(rechargeQuery);
        const history = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRechargeHistory(history);
      } catch (indexError) {
        // If composite index error occurs, fall back to a simpler query without orderBy
        console.log('Index error, falling back to simpler query:', indexError);
        
        // Fallback query without orderBy
        const fallbackQuery = query(
          collection(db, 'rechargeRequests'),
          where('userId', '==', currentUser.uid)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackHistory = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort the results in memory instead
        fallbackHistory.sort((a, b) => {
          if (sortDirection === 'asc') {
            return a[sortField] > b[sortField] ? 1 : -1;
          } else {
            return a[sortField] < b[sortField] ? 1 : -1;
          }
        });
        
        setRechargeHistory(fallbackHistory);
      }
    } catch (error) {
      // Check if it's an index error
      if (error.message && error.message.includes('index')) {
        setError('The recharge history requires a database index. Administrators can create it using the link below.');
      } else {
        setError('Failed to load recharge history: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field) {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new field
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function renderSortIndicator(field) {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
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
    <Container className="py-3 px-3 px-md-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center py-2 px-3">
          <h5 className="mb-0 fs-5">Recharge History</h5>
          <Link to="/profile">
            <Button variant="outline-primary" size="sm" className="px-2 py-1">Back to Profile</Button>
          </Link>
        </Card.Header>
        <Card.Body className="p-2 p-md-3">
          {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
          
          {error && error.includes('index') && (
            <Alert variant="info" className="mt-2 p-2 small">
              <p><strong>Admin Note:</strong> This feature requires a Firestore index. Please visit the Firebase console to create it:</p>
              <a href="https://console.firebase.google.com/v1/r/project/customer-abe40/firestore/indexes?create_composite=Cldwcm9qZWN0cy9jdXN0b21lci1hYmU0MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcmVjaGFyZ2VSZXF1ZXN0cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoPCgtyZXF1ZXN0RGF0ZRACGgwKCF9fbmFtZV9fEAI" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="btn btn-sm btn-outline-primary mt-2 py-1 px-2">
                Create Firestore Index
              </a>
              <p className="mt-2 small text-muted" style={{fontSize: '0.8rem'}}>The application will continue to function with limited sorting capabilities until the index is created.</p>
            </Alert>
          )}
          
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2 small">Loading recharge history...</p>
            </div>
          ) : rechargeHistory.length > 0 ? (
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
                    <th>Payment Method</th>
                    <th>Transaction ID</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      Status {renderSortIndicator('status')}
                    </th>
                    <th>Payment Proof</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeHistory.map(recharge => (
                    <tr key={recharge.id}>
                      <td>{new Date(recharge.requestDate).toLocaleDateString()} {new Date(recharge.requestDate).toLocaleTimeString()}</td>
                      <td>Rs. {recharge.amount}</td>
                      <td>{recharge.paymentMethod}</td>
                      <td>{recharge.transactionId}</td>
                      <td>{getStatusBadge(recharge.status)}</td>
                      <td>
                        {recharge.proofImageUrl ? (
                          <Image 
                            src={recharge.proofImageUrl} 
                            width="30" 
                            height="30" 
                            thumbnail 
                            style={{ cursor: 'pointer' }}
                            onClick={() => window.open(recharge.proofImageUrl, '_blank')}
                            alt="Payment Proof"
                          />
                        ) : (
                          <span className="text-muted small">No image</span>
                        )}
                      </td>
                      <td>
                        {recharge.notes ? (
                          <span>{recharge.notes}</span>
                        ) : (
                          <span className="text-muted small">No notes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info" className="p-2 small">
              You haven&apos;t made any recharge requests yet. Go to your profile to recharge your wallet.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default RechargeHistory;