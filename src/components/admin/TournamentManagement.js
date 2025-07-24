import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Image } from 'react-bootstrap';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TournamentStatusService from '../../services/TournamentStatusService';
import initCloudinary from '../../utils/cloudinaryConfig';
import DOMPurify from 'dompurify';

function TournamentManagement() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTournamentId, setCurrentTournamentId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    gameName: '',
    gameType: 'PUBG',
    tournamentDate: '',
    tournamentTime: '',
    entryFee: 0,
    prizePool: 0,
    maxParticipants: 100,
    matchDetails: '',
    status: 'upcoming',
    resultImage: ''
  });
  
  // Modal state for result image upload
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [activeWidget, setActiveWidget] = useState(null);

  // Fetch tournaments when component mounts and initialize Cloudinary
  useEffect(() => {
    fetchTournaments();
    
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

  async function fetchTournaments() {
    try {
      setLoading(true);
      
      // Check and update tournament statuses before fetching
      await TournamentStatusService.checkAndUpdateTournamentStatuses();
      
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      const tournamentsList = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTournaments(tournamentsList);
    } catch (error) {
      setError('Failed to fetch tournaments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'entryFee' || name === 'prizePool' || name === 'maxParticipants' 
        ? Number(value) 
        : value
    });
  }

  function openCreateModal() {
    setFormData({
      gameName: '',
      gameType: 'PUBG',
      tournamentDate: '',
      tournamentTime: '',
      entryFee: 0,
      prizePool: 0,
      maxParticipants: 100,
      matchDetails: '',
      status: 'upcoming',
      resultImage: ''
    });
    setEditMode(false);
    setShowModal(true);
  }

  function openEditModal(tournament) {
    // Format date for the date input
    const tournamentDate = tournament.tournamentDate?.toDate 
      ? tournament.tournamentDate.toDate().toISOString().split('T')[0]
      : '';
    
    // Format time for the time input
    const tournamentTime = tournament.tournamentTime || '';
    
    setFormData({
      gameName: tournament.gameName || '',
      gameType: tournament.gameType || 'PUBG',
      tournamentDate,
      tournamentTime,
      entryFee: tournament.entryFee || 0,
      prizePool: tournament.prizePool || 0,
      maxParticipants: tournament.maxParticipants || 100,
      matchDetails: tournament.matchDetails || '',
      status: tournament.status || 'upcoming',
      resultImage: tournament.resultImage || ''
    });
    setCurrentTournamentId(tournament.id);
    setEditMode(true);
    setShowModal(true);
  }
  
  function openResultUploadModal(tournament) {
    setSelectedTournament(tournament);
    setUploadError('');
    setShowResultModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      
      // Base tournament data
      const baseTournamentData = {
        ...formData,
        tournamentDate: Timestamp.fromDate(new Date(formData.tournamentDate)),
        updatedAt: Timestamp.now()
      };
      
      if (editMode && currentTournamentId) {
        // Update existing tournament - don't modify participants
        const tournamentRef = doc(db, 'tournaments', currentTournamentId);
        await updateDoc(tournamentRef, baseTournamentData);
      } else {
        // Create new tournament - initialize with empty participants array
        const newTournamentData = {
          ...baseTournamentData,
          participants: [],
          createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'tournaments'), newTournamentData);
      }
      
      // Refresh tournaments list
      fetchTournaments();
      setShowModal(false);
    } catch (error) {
      setError('Failed to save tournament: ' + error.message);
    }
  }
  
  async function handleResultImageUpload(tournamentId, imageUrl) {
    try {
      setUploadError('');
      
      // Sanitize the image URL
      const sanitizedImageUrl = DOMPurify.sanitize(imageUrl);
      
      // Update tournament with result image URL
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        resultImage: sanitizedImageUrl,
        updatedAt: Timestamp.now()
      });
      
      // Refresh tournaments list
      fetchTournaments();
      setShowResultModal(false);
    } catch (error) {
      setUploadError('Failed to save result image: ' + error.message);
    }
  }

  async function handleDelete(tournamentId) {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      try {
        await deleteDoc(doc(db, 'tournaments', tournamentId));
        fetchTournaments();
      } catch (error) {
        setError('Failed to delete tournament: ' + error.message);
      }
    }
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Tournament Management</h1>
        <Button variant="success" onClick={openCreateModal}>
          Create Tournament
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <p>Loading tournaments...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Game</th>
              <th>Type</th>
              <th>Date & Time</th>
              <th>Entry Fee</th>
              <th>Prize Pool</th>
              <th>Participants</th>
              <th>Status</th>
              <th>Result Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">No tournaments found</td>
              </tr>
            ) : (
              tournaments.map(tournament => (
                <tr key={tournament.id}>
                  <td>{tournament.gameName}</td>
                  <td>{tournament.gameType}</td>
                  <td>
                    {tournament.tournamentDate?.toDate 
                      ? tournament.tournamentDate.toDate().toLocaleDateString() 
                      : 'N/A'}
                    {' '}
                    {tournament.tournamentTime || ''}
                  </td>
                  <td>Rs. {tournament.entryFee}</td>
                  <td>Rs. {tournament.prizePool}</td>
                  <td>{tournament.participants?.length || 0} / {tournament.maxParticipants}</td>
                  <td>
                    <span className={`badge bg-${tournament.status === 'completed' ? 'secondary' : tournament.status === 'live' ? 'success' : 'primary'}`}>
                      {tournament.status}
                    </span>
                  </td>
                  <td>
                    {tournament.resultImage ? (
                      <Image 
                        src={tournament.resultImage} 
                        thumbnail 
                        width="50" 
                        height="50" 
                        alt="Tournament Result" 
                      />
                    ) : (
                      <span className="text-muted">No image</span>
                    )}
                  </td>
                  <td>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="me-2"
                      onClick={() => openEditModal(tournament)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="success" 
                      size="sm" 
                      className="me-2"
                      onClick={() => openResultUploadModal(tournament)}
                    >
                      Upload Result
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleDelete(tournament.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
      
      {/* Create/Edit Tournament Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Tournament' : 'Create Tournament'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Tournament Name</Form.Label>
              <Form.Control 
                type="text" 
                name="gameName" 
                value={formData.gameName} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Game Type</Form.Label>
              <Form.Select 
                name="gameType" 
                value={formData.gameType} 
                onChange={handleInputChange} 
                required
              >
                <option value="PUBG">PUBG</option>
                <option value="Dead Shot">Dead Shot</option>
                <option value="8 Ball Pool">8 Ball Pool</option>
                <option value="Call of Duty">Call of Duty</option>
                <option value="Free Fire">Free Fire</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Tournament Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="tournamentDate" 
                    value={formData.tournamentDate} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Tournament Time</Form.Label>
                  <Form.Control 
                    type="time" 
                    name="tournamentTime" 
                    value={formData.tournamentTime} 
                    onChange={handleInputChange} 
                    required 
                  />
                </Form.Group>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Entry Fee (Rs.)</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="entryFee" 
                    value={formData.entryFee} 
                    onChange={handleInputChange} 
                    min="0" 
                    required 
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Prize Pool (Rs.)</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="prizePool" 
                    value={formData.prizePool} 
                    onChange={handleInputChange} 
                    min="0" 
                    required 
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Max Participants</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="maxParticipants" 
                    value={formData.maxParticipants} 
                    onChange={handleInputChange} 
                    min="1" 
                    required 
                  />
                </Form.Group>
              </div>
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label>Match Details (Room ID, Password, etc.)</Form.Label>
              <Form.Control 
                as="textarea" 
                name="matchDetails" 
                value={formData.matchDetails} 
                onChange={handleInputChange} 
                rows={3} 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange} 
                required
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editMode ? 'Update Tournament' : 'Create Tournament'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Result Image Upload Modal */}
      <Modal show={showResultModal} onHide={() => {
        // Clean up any active widget when modal is closed
        if (activeWidget) {
          try {
            activeWidget.close();
          } catch (err) {
            // Use debug level logging instead of error to avoid console errors
            if (process.env.NODE_ENV === 'development') {
              console.debug('Error closing widget:', err);
            }
          }
          setActiveWidget(null);
        }
        
        // Remove any lingering container
        const container = document.getElementById('cloudinary-widget-container');
        if (container) {
          document.body.removeChild(container);
        }
        
        setShowResultModal(false);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Tournament Result</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {uploadError && <Alert variant="danger">{uploadError}</Alert>}
          
          {selectedTournament && (
            <div className="text-center">
              <h5>{selectedTournament.gameName}</h5>
              <p>Upload an image showing the tournament results</p>
              
              {/* Direct file upload input as alternative to Cloudinary widget */}
              <Form.Group className="mb-3">
                <Form.Label>Upload Result Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5000000) {
                      setUploadError('File size exceeds 5MB limit. Please choose a smaller image.');
                      return;
                    }
                    
                    // Create a FormData object to send the file
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
                    formData.append('folder', 'tournament_results');
                    
                    // Show loading state
                    setUploadError('Uploading image...');
                    
                    // Upload directly to Cloudinary API
                    fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                      method: 'POST',
                      body: formData,
                    })
                    .then(response => {
                      if (!response.ok) {
                        throw new Error('Network response was not ok');
                      }
                      return response.json();
                    })
                    .then(data => {
                      // Handle successful upload
                      handleResultImageUpload(selectedTournament.id, data.secure_url);
                      setUploadError('');
                      if (process.env.NODE_ENV === 'development') {
                        console.debug('Upload successful:', data.secure_url);
                      }
                    })
                    .catch(error => {
                      if (process.env.NODE_ENV === 'development') {
                        console.debug('Upload failed:', error);
                      }
                      setUploadError('Image upload failed: ' + error.message);
                    });
                  }}
                />
                <Form.Text className="text-muted">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF.
                </Form.Text>
              </Form.Group>
              
              <Button
                variant="primary"
                onClick={() => {
                  try {
                    // Check if cloudinary is available
                    if (!window.cloudinary) {
                      setUploadError('Cloudinary is not loaded. Please use the file upload option above.');
                      // Use debug level logging to avoid console errors
                      if (process.env.NODE_ENV === 'development') {
                        console.debug('Cloudinary not available, using alternative upload method');
                      }
                      return;
                    }
                    
                    if (typeof window.cloudinary.createUploadWidget !== 'function') {
                      setUploadError('Cloudinary widget is not available. Please use the file upload option above.');
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
                      setUploadError('Cloudinary configuration is missing. Please check your environment variables.');
                      return;
                    }
                    
                    // Create and open the Cloudinary upload widget with inline container
                    const myWidget = window.cloudinary.createUploadWidget({
                      cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
                      uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
                      folder: 'tournament_results',
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
                        // Handle successful upload
                        handleResultImageUpload(selectedTournament.id, result.info.secure_url);
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
                        setUploadError('Image upload failed: ' + (error.message || 'Unknown error'));
                        
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
                      setUploadError('Failed to open upload widget: ' + openError.message);
                      
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
                    setUploadError('Failed to create upload widget: ' + err.message);
                  }
                }}
              >
                Upload Result Image
              </Button>
              
              {selectedTournament.resultImage && (
                <div className="mt-3">
                  <p>Current Result Image:</p>
                  <Image 
                    src={selectedTournament.resultImage} 
                    thumbnail 
                    style={{ maxHeight: '200px' }} 
                    alt="Tournament Result" 
                  />
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResultModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default TournamentManagement;