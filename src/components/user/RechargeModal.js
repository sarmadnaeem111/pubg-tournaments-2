import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Form, Alert, Image, Card } from 'react-bootstrap';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';
import CSRFToken from '../security/CSRFToken';
import DOMPurify from 'dompurify';
import initCloudinary from '../../utils/cloudinaryConfig';

function RechargeModal({ show, onHide, currentUser, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const [activeWidget, setActiveWidget] = useState(null);
  const [paymentAccounts, setPaymentAccounts] = useState({
    bankAccountName: '',
    bankAccountNumber: '',
    easyPasaOwnerName: '',
    easyPasaInfo: ''
  });
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch admin payment account information
  useEffect(() => {
    async function fetchPaymentAccounts() {
      try {
        setLoadingAccounts(true);
        const paymentSettingsRef = doc(db, 'adminSettings', 'paymentAccounts');
        const docSnap = await getDoc(paymentSettingsRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPaymentAccounts({
            bankAccountName: data.bankAccountName || '',
            bankAccountNumber: data.bankAccountNumber || '',
            easyPasaOwnerName: data.easyPasaOwnerName || '',
            easyPasaInfo: data.easyPasaInfo || ''
          });
        }
      } catch (error) {
        console.error('Error fetching payment accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    }

    if (show) {
      fetchPaymentAccounts();
    }
  }, [show]);

  // Reset form when modal is opened
  useEffect(() => {
    if (show) {
      resetForm();
    }
    return () => {
      // Close any active widget when component unmounts
      if (activeWidget) {
        try {
          activeWidget.close();
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('Error closing widget during unmount:', err);
          }
        }
      }
    };
  }, [show, activeWidget]);

  const resetForm = () => {
    setAmount('');
    setTransactionId('');
    setPaymentMethod('');
    setImageUrl('');
    setError('');
    setSuccess('');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should not exceed 5MB');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const data = await response.json();
      
      // Sanitize the URL
      const sanitizedUrl = DOMPurify.sanitize(data.secure_url);
      setImageUrl(sanitizedUrl);
    } catch (error) {
      setError('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const openCloudinaryWidget = () => {
    if (!window.cloudinary) {
      setError('Image upload widget is not available. Please use the file upload option.');
      return;
    }

    try {
      // Initialize Cloudinary
      initCloudinary();

      // Create and open the upload widget
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'camera'],
          multiple: false,
          maxFiles: 1,
          maxFileSize: 5000000, // 5MB
          resourceType: 'image',
          folder: 'recharge_proofs',
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          styles: {
            palette: {
              window: '#FFFFFF',
              windowBorder: '#90A0B3',
              tabIcon: '#0078FF',
              menuIcons: '#5A616A',
              textDark: '#000000',
              textLight: '#FFFFFF',
              link: '#0078FF',
              action: '#FF620C',
              inactiveTabIcon: '#0E2F5A',
              error: '#F44235',
              inProgress: '#0078FF',
              complete: '#20B832',
              sourceBg: '#E4EBF1'
            }
          }
        },
        (error, result) => {
          if (error) {
            setError('Upload error: ' + error.message);
            return;
          }
          
          if (result.event === 'success') {
            // Sanitize the URL
            const sanitizedUrl = DOMPurify.sanitize(result.info.secure_url);
            setImageUrl(sanitizedUrl);
            setError('');
          }
        }
      );

      widget.open();
      setActiveWidget(widget);
    } catch (error) {
      setError('Failed to open upload widget: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    try {
      // Validate inputs
      if (!amount || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (!paymentMethod) {
        setError('Please select a payment method');
        return;
      }

      if (!transactionId) {
        setError('Please enter a transaction ID');
        return;
      }

      if (!imageUrl) {
        setError('Please upload a payment proof image');
        return;
      }

      // Sanitize inputs
      const sanitizedTransactionId = sanitizeInput(transactionId);
      const sanitizedPaymentMethod = sanitizeInput(paymentMethod);
      const sanitizedImageUrl = sanitizeInput(imageUrl);
      const parsedAmount = parseFloat(amount);

      // Create recharge request in Firestore
      await addDoc(collection(db, 'rechargeRequests'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: parsedAmount,
        transactionId: sanitizedTransactionId,
        paymentMethod: sanitizedPaymentMethod,
        proofImageUrl: sanitizedImageUrl,
        status: 'pending',
        requestDate: new Date().toISOString(),
        processedDate: null,
        notes: ''
      });

      // Show success message
      setSuccess('Recharge request submitted successfully. The admin will review your request.');

      // Reset form
      resetForm();

      // Notify parent component
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after a delay
      setTimeout(() => {
        onHide();
      }, 3000);
    } catch (error) {
      setError('Failed to submit recharge request: ' + error.message);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="responsive-modal">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Recharge Wallet</Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-3 py-3">
        {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
        {success && <Alert variant="success" className="p-2 small">{success}</Alert>}

        <Form>
          <CSRFToken />

          <Form.Group className="mb-3">
            <Form.Label className="small">Amount (Rs.)</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter amount to recharge"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              className="form-control-sm"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small">Payment Method</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-select-sm"
              required
            >
              <option value="">Select payment method</option>
              {(paymentAccounts.easyPasaInfo || paymentAccounts.easyPasaOwnerName) && <option value="Easy Pasa">Easy Pasa</option>}
              {paymentAccounts.bankAccountNumber && <option value="Bank Transfer">Bank Transfer</option>}
            </Form.Select>
          </Form.Group>
          
          {/* Display payment account information */}
          <Card className="mb-3 bg-light">
            <Card.Body className="p-3">
              <Card.Title className="fs-6 mb-2">Payment Account Information</Card.Title>
              {loadingAccounts ? (
                <p className="small text-muted">Loading payment information...</p>
              ) : (
                <div className="small">
                  {paymentMethod === 'Easy Pasa' && paymentAccounts.easyPasaInfo && (
                    <div>
                      {paymentAccounts.easyPasaOwnerName && (
                        <div><strong>Account Owner:</strong> {paymentAccounts.easyPasaOwnerName}</div>
                      )}
                      <strong>Easy Pasa:</strong> {paymentAccounts.easyPasaInfo}
                    </div>
                  )}
                  {paymentMethod === 'Bank Transfer' && paymentAccounts.bankAccountNumber && (
                    <div>
                      <strong>Account Name:</strong> {paymentAccounts.bankAccountName}<br />
                      <strong>Account Number:</strong> {paymentAccounts.bankAccountNumber}
                    </div>
                  )}
                  <p className="text-muted mt-2 mb-0">
                    Please send the exact amount to the account above and enter the transaction ID below.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>

          <Form.Group className="mb-3">
            <Form.Label className="small">Transaction ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
              className="form-control-sm"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small">Payment Proof</Form.Label>
            {imageUrl && (
              <div className="mb-3">
                <Image
                  src={imageUrl}
                  alt="Payment Proof"
                  thumbnail
                  style={{ maxHeight: '120px' }}
                  className="img-fluid"
                />
              </div>
            )}
            <div className="d-flex flex-column flex-md-row gap-2">
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                disabled={uploading}
                size="sm"
                className="mb-2 mb-md-0"
              />
              <Button
                variant="outline-secondary"
                onClick={openCloudinaryWidget}
                disabled={uploading}
                size="sm"
                className="w-100 w-md-auto"
              >
                Upload Widget
              </Button>
            </div>
            <Form.Text className="text-muted small">
              Max file size: 5MB. Supported formats: JPG, PNG, GIF, WEBP.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="px-3 py-2 d-flex justify-content-between">
        <Button variant="secondary" onClick={onHide} size="sm" className="px-3">
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!amount || amount <= 0 || !transactionId || !imageUrl || uploading}
          size="sm"
          className="px-3"
        >
          Submit Request
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RechargeModal;