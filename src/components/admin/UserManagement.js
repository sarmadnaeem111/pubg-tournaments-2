import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [walletAmount, setWalletAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      setError('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openWalletModal(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCurrentUserId(userId);
        setCurrentBalance(userData.walletBalance || 0);
        setWalletAmount(0);
        setShowModal(true);
      } else {
        setError('User not found');
      }
    } catch (error) {
      setError('Failed to fetch user data: ' + error.message);
    }
  }

  async function handleAddFunds() {
    if (!currentUserId || walletAmount <= 0) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBalance = (userData.walletBalance || 0) + Number(walletAmount);
        
        await updateDoc(userRef, {
          walletBalance: newBalance,
          lastUpdated: new Date().toISOString()
        });
        
        // Refresh users list
        fetchUsers();
        setShowModal(false);
      }
    } catch (error) {
      setError('Failed to update wallet: ' + error.message);
    }
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">User Management</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Wallet Balance</th>
              <th>Joined Tournaments</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.role || 'user'}</td>
                  <td>Rs. {user.walletBalance || 0}</td>
                  <td>{user.joinedTournaments?.length || 0}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => openWalletModal(user.id)}
                    >
                      Add Funds
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
      
      {/* Add Funds Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Funds to Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Current Balance</Form.Label>
              <Form.Control 
                type="text" 
                value={`Rs. ${currentBalance}`} 
                disabled 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Amount to Add (Rs.)</Form.Label>
              <Form.Control 
                type="number" 
                value={walletAmount} 
                onChange={(e) => setWalletAmount(Number(e.target.value))} 
                min="1" 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>New Balance</Form.Label>
              <Form.Control 
                type="text" 
                value={`Rs. ${currentBalance + Number(walletAmount)}`} 
                disabled 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddFunds}
            disabled={walletAmount <= 0}
          >
            Add Funds
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default UserManagement;