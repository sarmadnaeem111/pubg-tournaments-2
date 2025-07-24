import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Badge, Image } from 'react-bootstrap';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';
import DOMPurify from 'dompurify';
import initCloudinary from '../../utils/cloudinaryConfig';

function WithdrawalManagement() {
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [activeWidget, setActiveWidget] = useState(null);

  // Fetch withdrawal requests on component mount and initialize Cloudinary
  useEffect(() => {
    fetchWithdrawalRequests();
    
    // Initialize Cloudinary when component mounts with multiple retries
    const initCloudinaryWithRetries = (maxRetries = 5, delay = 1500) => {
      let retryCount = 0;
      let cloudinaryInitialized = false;
      
      const attemptInit = () => {
        // Check if Cloudinary script is loaded
        if (!window.cloudinary) {
          if (retryCount < maxRetries) {
            retryCount++;
            // Use debug level logging instead of console.log to reduce console noise
            if (process.env.NODE_ENV === 'development') {
              console.debug(`Waiting for Cloudinary script to load (${retryCount}/${maxRetries})...`);
            }
            setTimeout(attemptInit, delay);
          } else {
            // Use debug level logging instead of warning to avoid console errors
            if (process.env.NODE_ENV === 'development') {
              console.debug('Cloudinary script not loaded after maximum retries - widget functionality may be limited');
            }
          }
          return;
        }
        
        // Try to initialize
        const cloudinaryInstance = initCloudinary();
        
        // If not successful and we haven't exceeded max retries, try again after a delay
        if (!cloudinaryInstance || typeof cloudinaryInstance.createUploadWidget !== 'function') {
          if (retryCount < maxRetries) {
            retryCount++;
            // Use debug level logging
            if (process.env.NODE_ENV === 'development') {
              console.debug(`Retrying Cloudinary initialization (${retryCount}/${maxRetries})...`);
            }
            setTimeout(attemptInit, delay);
          } else {
            // Use debug level logging instead of warning to avoid console errors
            if (process.env.NODE_ENV === 'development') {
              console.debug('Cloudinary widget not available after maximum retries - upload functionality may be limited');
            }
          }
        } else {
          cloudinaryInitialized = true;
          if (process.env.NODE_ENV === 'development') {
            console.debug('Cloudinary initialization successful');
          }
        }
      };
      
      // Start the initialization process
      attemptInit();
      
      // Return initialization status for potential use elsewhere
      return () => cloudinaryInitialized;
    };
    
    initCloudinaryWithRetries();
    
    // Cleanup function when component unmounts
    return () => {
      // Close any active widget
      if (activeWidget) {
        try {
          activeWidget.close();
        } catch (err) {
          // Use debug level logging instead of error to avoid console errors
          if (process.env.NODE_ENV === 'development') {
            console.debug('Error closing widget during unmount:', err);
          }
        }
      }
      
      // Remove any lingering container
      const container = document.getElementById('cloudinary-widget-container');
      if (container) {
        document.body.removeChild(container);
      }
    };
  }, [activeWidget]);

  async function fetchWithdrawalRequests() {
    try {
      setLoading(true);
      const withdrawalCollection = collection(db, 'withdrawalRequests');
      const withdrawalSnapshot = await getDocs(withdrawalCollection);
      const withdrawalList = withdrawalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date (newest first) and then by status (pending first)
      withdrawalList.sort((a, b) => {
        // First sort by status (pending first)
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // Then sort by date (newest first)
        return new Date(b.requestDate) - new Date(a.requestDate);
      });
      
      setWithdrawalRequests(withdrawalList);
    } catch (error) {
      setError('Failed to fetch withdrawal requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function openRequestModal(request) {
    setCurrentRequest(request);
    setAdminNotes(request.notes || '');
    setImageUrl(request.proofImageUrl || '');
    setShowModal(true);
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or GIF image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setUploading(true);
      
      // Create a FormData object to send the file to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'withdrawal_proofs');
      
      // Upload directly to Cloudinary API
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      // Sanitize the URL
      const sanitizedUrl = DOMPurify.sanitize(data.secure_url);
      setImageUrl(sanitizedUrl);
      setUploading(false);
    } catch (error) {
      setError('Failed to upload image: ' + error.message);
      setUploading(false);
    }
  };

  async function handleApproveRequest() {
    if (!currentRequest) return;

    try {
      // Update the withdrawal request status
      const requestRef = doc(db, 'withdrawalRequests', currentRequest.id);
      await updateDoc(requestRef, {
        status: 'approved',
        processedDate: new Date().toISOString(),
        notes: sanitizeInput(adminNotes),
        proofImageUrl: imageUrl || null
      });
      
      // Update user's wallet balance
      const userRef = doc(db, 'users', currentRequest.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentBalance = userData.walletBalance || 0;
        const newBalance = Math.max(0, currentBalance - currentRequest.amount);
        
        await updateDoc(userRef, {
          walletBalance: newBalance,
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Show success message and refresh the list
      setSuccess('Withdrawal request approved successfully');
      fetchWithdrawalRequests();
      setShowModal(false);
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to approve withdrawal request: ' + error.message);
    }
  }

  async function handleRejectRequest() {
    if (!currentRequest) return;

    try {
      // Update the withdrawal request status
      const requestRef = doc(db, 'withdrawalRequests', currentRequest.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        processedDate: new Date().toISOString(),
        notes: sanitizeInput(adminNotes),
        proofImageUrl: imageUrl || null
      });
      
      // Show success message and refresh the list
      setSuccess('Withdrawal request rejected successfully');
      fetchWithdrawalRequests();
      setShowModal(false);
      
      // Clear success message after a delay
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to reject withdrawal request: ' + error.message);
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
      <h1 className="mb-4">Withdrawal Requests Management</h1>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      {loading ? (
        <p>Loading withdrawal requests...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Account Details</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Proof</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawalRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">No withdrawal requests found</td>
              </tr>
            ) : (
              withdrawalRequests.map(request => (
                <tr key={request.id}>
                  <td>{request.userEmail}</td>
                  <td>Rs. {request.amount}</td>
                  <td>
                    <strong>Name:</strong> {request.accountName}<br />
                    <strong>Bank:</strong> {request.bankName}<br />
                    <strong>Account:</strong> {request.accountNumber}
                  </td>
                  <td>{new Date(request.requestDate).toLocaleString()}</td>
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
      
      {/* Process Withdrawal Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {currentRequest?.status === 'pending' ? 'Process Withdrawal Request' : 'Withdrawal Request Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentRequest && (
            <Form>
              <div className="mb-3">
                <strong>User:</strong> {currentRequest.userEmail}
              </div>
              
              <div className="mb-3">
                <strong>Amount:</strong> Rs. {currentRequest.amount}
              </div>
              
              <div className="mb-3">
                <strong>Account Details:</strong><br />
                Name: {currentRequest.accountName}<br />
                Bank: {currentRequest.bankName}<br />
                Account Number: {currentRequest.accountNumber}
              </div>
              
              <div className="mb-3">
                <strong>Request Date:</strong> {new Date(currentRequest.requestDate).toLocaleString()}
              </div>
              
              {currentRequest.processedDate && (
                <div className="mb-3">
                  <strong>Processed Date:</strong> {new Date(currentRequest.processedDate).toLocaleString()}
                </div>
              )}
              
              <div className="mb-3">
                <strong>Status:</strong> {getStatusBadge(currentRequest.status)}
              </div>
              
              {currentRequest.proofImageUrl && (
                <div className="mb-3">
                  <strong>Proof Image:</strong><br />
                  <Image 
                    src={currentRequest.proofImageUrl} 
                    alt="Payment Proof" 
                    thumbnail 
                    style={{ maxWidth: '100%', maxHeight: '200px' }} 
                  />
                </div>
              )}
              
              {currentRequest.status === 'pending' && (
                <Form.Group className="mb-3">
                  <Form.Label>Upload Payment Proof</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    disabled={uploading}
                  />
                  <Form.Text className="text-muted">
                    Max file size: 5MB. Supported formats: JPG, PNG, GIF.
                  </Form.Text>
                  
                  <div className="mt-3 mb-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        try {
                          // Check if cloudinary is available
                          if (!window.cloudinary) {
                            setError('Cloudinary is not loaded. Please use the file upload option above.');
                            // Use debug level logging to avoid console errors
                            if (process.env.NODE_ENV === 'development') {
                              console.debug('Cloudinary not available, using alternative upload method');
                            }
                            return;
                          }
                          
                          if (typeof window.cloudinary.createUploadWidget !== 'function') {
                            setError('Cloudinary widget is not available. Please use the file upload option above.');
                            // Use debug level logging to avoid console errors
                            if (process.env.NODE_ENV === 'development') {
                              console.debug('Cloudinary widget not available, using alternative upload method');
                            }
                            return;
                          }
                          
                          // Create a container element for the widget
                          const widgetContainer = document.createElement('div');
                          widgetContainer.id = 'cloudinary-widget-container';
                          document.body.appendChild(widgetContainer);
                          
                          // Check if environment variables are set
                          if (!process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || !process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET) {
                            // Use debug level logging instead of error to avoid console errors
                            if (process.env.NODE_ENV === 'development') {
                              console.debug('Missing Cloudinary environment variables');
                            }
                            setError('Cloudinary configuration is missing. Please check your environment variables.');
                            return;
                          }
                          
                          // Create and open the Cloudinary upload widget with inline container
                          const myWidget = window.cloudinary.createUploadWidget({
                            cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
                            uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
                            folder: 'withdrawal_proofs',
                            cropping: false,
                            sources: ['local', 'url', 'camera'],
                            resourceType: 'image',
                            maxFileSize: 5000000, // 5MB
                            maxImageWidth: 2000,
                            maxImageHeight: 2000,
                            secure: true,
                            multiple: false,
                            // Use inline container to avoid cross-origin issues
                            inlineContainer: '#cloudinary-widget-container',
                            showAdvancedOptions: false,
                            // Add frameOrigin to fix postMessage error
                            frameOrigin: window.location.origin,
                            // Add CORS settings
                            corsUseCredentials: false,
                            autoMinimize: true,
                            // Simplified styling
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
                          }, (error, result) => {
                            if (!error && result && result.event === "success") {
                              // Sanitize the URL
                              const sanitizedUrl = DOMPurify.sanitize(result.info.secure_url);
                              setImageUrl(sanitizedUrl);
                              
                              // Use debug level logging instead of log to reduce console noise
                              if (process.env.NODE_ENV === 'development') {
                                console.debug('Upload successful:', result.info.secure_url);
                              }
                              
                              // Remove the container element after successful upload
                              const container = document.getElementById('cloudinary-widget-container');
                              if (container) {
                                document.body.removeChild(container);
                              }
                            } else if (error) {
                              // Handle upload failure
                              // Use debug level logging instead of error to avoid console errors
                              if (process.env.NODE_ENV === 'development') {
                                console.debug('Upload failed:', error);
                              }
                              setError('Image upload failed: ' + (error.message || 'Unknown error'));
                              
                              // Remove the container element on error
                              const container = document.getElementById('cloudinary-widget-container');
                              if (container) {
                                document.body.removeChild(container);
                              }
                            } else if (result && result.event === "close") {
                              // Use debug level logging instead of log to reduce console noise
                              if (process.env.NODE_ENV === 'development') {
                                console.debug('Upload widget closed');
                              }
                              
                              // Remove the container element when widget is closed
                              const container = document.getElementById('cloudinary-widget-container');
                              if (container) {
                                document.body.removeChild(container);
                              }
                            }
                          });
                          
                          // Store reference to the widget for cleanup
                          setActiveWidget(myWidget);
                          
                          // Log before opening widget - use debug level logging
                          if (process.env.NODE_ENV === 'development') {
                            console.debug('Opening Cloudinary widget with cloud name:', process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
                          }
                          
                          try {
                            myWidget.open();
                          } catch (openError) {
                            // Use debug level logging instead of error to avoid console errors
                            if (process.env.NODE_ENV === 'development') {
                              console.debug('Error opening Cloudinary widget:', openError);
                            }
                            setError('Failed to open upload widget: ' + openError.message);
                            
                            // Clean up the widget and container
                            setActiveWidget(null);
                            const container = document.getElementById('cloudinary-widget-container');
                            if (container) {
                              document.body.removeChild(container);
                            }
                          }
                        } catch (err) {
                          // Use debug level logging instead of error to avoid console errors
                          if (process.env.NODE_ENV === 'development') {
                            console.debug('Error creating widget:', err);
                          }
                          setError('Failed to create upload widget: ' + err.message);
                        }
                      }}
                    >
                      Upload with Cloudinary
                    </Button>
                  </div>
                  
                  {uploading && <p className="mt-2">Uploading image...</p>}
                  {imageUrl && !uploading && (
                    <div className="mt-2">
                      <p className="text-success">Image uploaded successfully!</p>
                      <Image 
                        src={imageUrl} 
                        alt="Payment Proof Preview" 
                        thumbnail 
                        style={{ maxWidth: '100%', maxHeight: '150px' }} 
                      />
                    </div>
                  )}
                </Form.Group>
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
            </Form>
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

export default WithdrawalManagement;