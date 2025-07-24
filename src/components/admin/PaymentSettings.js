import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';
import CSRFToken from '../security/CSRFToken';

function PaymentSettings() {
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [easyPasaOwnerName, setEasyPasaOwnerName] = useState('');
  const [easyPasaInfo, setEasyPasaInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch existing payment settings on component mount
  useEffect(() => {
    async function fetchPaymentSettings() {
      try {
        setLoading(true);
        const paymentSettingsRef = doc(db, 'adminSettings', 'paymentAccounts');
        const docSnap = await getDoc(paymentSettingsRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBankAccountName(data.bankAccountName || '');
          setBankAccountNumber(data.bankAccountNumber || '');
          setEasyPasaOwnerName(data.easyPasaOwnerName || '');
          setEasyPasaInfo(data.easyPasaInfo || '');
        }
      } catch (error) {
        setError('Failed to load payment settings: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      // Validate inputs
      if (!bankAccountName.trim() && !bankAccountNumber.trim() && !easyPasaOwnerName.trim() && !easyPasaInfo.trim()) {
        setError('Please provide at least one payment method information');
        return;
      }
      
      // Sanitize inputs
      const sanitizedBankAccountName = sanitizeInput(bankAccountName.trim());
      const sanitizedBankAccountNumber = sanitizeInput(bankAccountNumber.trim());
      const sanitizedEasyPasaOwnerName = sanitizeInput(easyPasaOwnerName.trim());
      const sanitizedEasyPasaInfo = sanitizeInput(easyPasaInfo.trim());
      
      // Save to Firestore
      const paymentSettingsRef = doc(db, 'adminSettings', 'paymentAccounts');
      await setDoc(paymentSettingsRef, {
        bankAccountName: sanitizedBankAccountName,
        bankAccountNumber: sanitizedBankAccountNumber,
        easyPasaOwnerName: sanitizedEasyPasaOwnerName,
        easyPasaInfo: sanitizedEasyPasaInfo,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSuccess('Payment settings updated successfully');
    } catch (error) {
      setError('Failed to update payment settings: ' + error.message);
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Payment Settings</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Payment Account Information</Card.Title>
          <Card.Text className="text-muted mb-4">
            Enter your payment account details below. This information will be displayed to users when they recharge their wallet.
          </Card.Text>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <CSRFToken />
            
            <Form.Group className="mb-3">
              <Form.Label>Bank Account Owner Name</Form.Label>
              <Form.Control
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Enter bank account owner name"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Bank Account Number</Form.Label>
              <Form.Control
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Enter bank account number"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
            <Form.Label>Easy Pasa Owner Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Easy Pasa account owner name"
              value={easyPasaOwnerName}
              onChange={(e) => setEasyPasaOwnerName(e.target.value)}
            />
            <Form.Text className="text-muted">
              Enter the name of the Easy Pasa account owner.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Easy Pasa Information</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Easy Pasa account number or any additional information"
              value={easyPasaInfo}
              onChange={(e) => setEasyPasaInfo(e.target.value)}
            />
            <Form.Text className="text-muted">
              Enter your Easy Pasa account number or any additional information users need to make payments.
            </Form.Text>
          </Form.Group>
            
            <Button variant="primary" type="submit" disabled={loading}>
              Save Settings
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PaymentSettings;