import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button, Image, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeInput } from '../../utils/security';

function TournamentDetails() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchTournamentDetails();
  }, [tournamentId]);

  async function fetchTournamentDetails() {
    try {
      setLoading(true);
      
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      
      if (tournamentSnap.exists()) {
        const tournamentData = {
          id: tournamentSnap.id,
          ...tournamentSnap.data(),
          // Check if current user has joined this tournament
          hasJoined: currentUser ? 
            tournamentSnap.data().participants?.some(p => p.userId === currentUser.uid) : 
            false
        };
        setTournament(tournamentData);
      } else {
        setError('Tournament not found');
      }
    } catch (error) {
      setError('Failed to fetch tournament details: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeVariant(status) {
    switch (status) {
      case 'upcoming': return 'primary';
      case 'live': return 'success';
      case 'completed': return 'secondary';
      default: return 'primary';
    }
  }

  function handleBack() {
    navigate(-1);
  }
  
  function handleImageClick() {
    setShowImageModal(true);
  }
  
  function handleCloseModal() {
    setShowImageModal(false);
  }

  if (loading) {
    return (
      <Container className="py-3 px-3 px-md-4">
        <p className="small">Loading tournament details...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-3 px-3 px-md-4">
        <Alert variant="danger" className="p-2 small">{error}</Alert>
        <Button variant="secondary" size="sm" onClick={handleBack}>Go Back</Button>
      </Container>
    );
  }

  if (!tournament) {
    return (
      <Container className="py-3 px-3 px-md-4">
        <Alert variant="warning" className="p-2 small">Tournament not found</Alert>
        <Button variant="secondary" size="sm" onClick={handleBack}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Container className="py-3 px-3 px-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
        <h1 className="mb-3 mb-md-0 fs-4 fs-md-3">Tournament Details</h1>
        <Button variant="secondary" size="sm" onClick={handleBack}>Go Back</Button>
      </div>
      
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center py-2 px-3">
          <Badge bg={getStatusBadgeVariant(tournament.status)} className="py-1 px-2">
            {tournament.status.toUpperCase()}
          </Badge>
          <span className="small">{tournament.gameType}</span>
        </Card.Header>
        <Card.Body className="p-3">
          <Card.Title className="fs-4 mb-3">{tournament.gameName}</Card.Title>
          
          <Row className="mb-3 gy-3">
            <Col xs={12} md={6}>
              <h5 className="fs-5">Tournament Information</h5>
              <p className="small mb-2">
                <strong>Date:</strong> {tournament.tournamentDate?.toDate 
                  ? tournament.tournamentDate.toDate().toLocaleDateString() 
                  : 'N/A'}
                <br />
                <strong>Time:</strong> {tournament.tournamentTime || 'N/A'}
                <br />
                <strong>Entry Fee:</strong> Rs. {tournament.entryFee}
                <br />
                <strong>Prize Pool:</strong> Rs. {tournament.prizePool}
                <br />
                <strong>Participants:</strong> {tournament.participants?.length || 0} / {tournament.maxParticipants}
              </p>
            </Col>
            <Col xs={12} md={6}>
              <h5 className="fs-5">Rules & Requirements</h5>
              <p className="small">{tournament.rules || 'No specific rules provided.'}</p>
            </Col>
          </Row>
          
          {tournament.description && (
            <div className="mb-3">
              <h5 className="fs-5">Description</h5>
              <p className="small">{tournament.description}</p>
            </div>
          )}
          
          {tournament.status === 'live' && tournament.matchDetails && (
            <div className="alert alert-success mt-3 p-2 small">
              <h5 className="fs-5">Match Details</h5>
              <p className="mb-1">{tournament.matchDetails}</p>
            </div>
          )}
          
          {tournament.status === 'upcoming' && tournament.hasJoined && tournament.matchDetails && (
            <div className="alert alert-info mt-3 p-2 small">
              <h5 className="fs-5">Match Details</h5>
              <p className="mb-1">{tournament.matchDetails}</p>
            </div>
          )}
          
          {tournament.status === 'completed' && (
            <div className="mt-3">
              <h5 className="fs-5">Results</h5>
              {tournament.results && <p className="small">{tournament.results}</p>}
              {tournament.resultImage && (
                <div className="mt-3">
                  <Image 
                    src={tournament.resultImage} 
                    fluid 
                    thumbnail 
                    style={{ maxWidth: '100%', maxHeight: '300px', cursor: 'pointer' }} 
                    alt="Tournament Result" 
                    onClick={handleImageClick}
                  />
                </div>
              )}
              
              {/* Image Zoom Modal */}
              <Modal show={showImageModal} onHide={handleCloseModal} size="lg" centered className="responsive-modal">
                <Modal.Header closeButton className="py-2 px-3">
                  <Modal.Title className="fs-5">Tournament Result</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                  {tournament.resultImage && (
                    <Image 
                      src={tournament.resultImage} 
                      fluid 
                      style={{ maxWidth: '100%' }} 
                      alt="Tournament Result" 
                    />
                  )}
                </Modal.Body>
                <Modal.Footer className="py-2 px-3">
                  <Button variant="secondary" size="sm" onClick={handleCloseModal}>
                    Close
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
          )}
          
          {tournament.participants && tournament.participants.length > 0 && (
            <div className="mt-3">
              <h5 className="fs-5">Participants ({tournament.participants.length})</h5>
              <ul className="list-group list-group-sm">
                {tournament.participants.map((participant, index) => (
                  <li key={index} className="list-group-item py-2 px-3 small">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                      <div className="mb-2 mb-md-0">
                        {/* Only show email to the participant themselves */}
                        {currentUser && participant.userId === currentUser.uid ? (
                          <>
                            <div className="d-block d-md-inline">{sanitizeInput(participant.email)}</div>
                            {participant.username && (
                              <span className="badge bg-info text-dark ms-md-2 mt-1 mt-md-0 d-inline-block">
                                {sanitizeInput(participant.username)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {participant.username ? (
                              <span className="badge bg-info text-dark d-inline-block">
                                {sanitizeInput(participant.username)}
                              </span>
                            ) : (
                              <span className="text-muted">Anonymous Player</span>
                            )}
                          </>
                        )}
                      </div>
                      <small className="text-muted" style={{fontSize: '0.75rem'}}>
                        Joined: {new Date(participant.joinedAt).toLocaleString()}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card.Body>
        <Card.Footer className={`py-2 px-3 small ${tournament.status === 'live' ? 'bg-success text-white' : tournament.status === 'completed' ? 'bg-secondary text-white' : ''}`}>
          {tournament.status === 'upcoming' ? 'Registration open' : tournament.status === 'live' ? 'Tournament in progress' : 'Tournament ended'}
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default TournamentDetails;