import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import TournamentStatusService from '../../services/TournamentStatusService';
import { useNavigate } from 'react-router-dom';

function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch user's tournaments on component mount
  useEffect(() => {
    if (currentUser) {
      fetchMyTournaments();
    }
  }, [currentUser]);

  async function fetchMyTournaments() {
    try {
      setLoading(true);
      
      // Check and update tournament statuses before fetching
      await TournamentStatusService.checkAndUpdateTournamentStatuses();
      
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      
      // Filter tournaments where the current user is a participant
      const myTournaments = tournamentsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(tournament => 
          tournament.participants?.some(p => p.userId === currentUser.uid)
        );
      
      // Sort tournaments by date (newest first)
      myTournaments.sort((a, b) => {
        const dateA = a.tournamentDate?.toDate ? a.tournamentDate.toDate() : new Date();
        const dateB = b.tournamentDate?.toDate ? b.tournamentDate.toDate() : new Date();
        return dateB - dateA;
      });
      
      setTournaments(myTournaments);
    } catch (error) {
      setError('Failed to fetch tournaments: ' + error.message);
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

  return (
    <Container className="py-4 px-3 px-md-5">
      <h1 className="mb-4 fs-2">My Tournaments</h1>
      
      {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
      
      {loading ? (
        <p className="small">Loading your tournaments...</p>
      ) : (
        <Row className="g-3">
          {tournaments.length === 0 ? (
            <Col>
              <Alert variant="info" className="p-2 small">You haven&apos;t joined any tournaments yet.</Alert>
            </Col>
          ) : (
            tournaments.map(tournament => (
              <Col key={tournament.id} xs={12} sm={6} lg={4} className="mb-3">
                <Card className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center py-2">
                    <Badge bg={getStatusBadgeVariant(tournament.status)} className="py-1 px-2">
                      {tournament.status.toUpperCase()}
                    </Badge>
                    <span className="small">{tournament.gameType}</span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Card.Title className="fs-5 mb-3">{tournament.gameName}</Card.Title>
                    <Card.Text className="small">
                      <strong>Date & Time:</strong> {tournament.tournamentDate?.toDate 
                        ? tournament.tournamentDate.toDate().toLocaleDateString() 
                        : 'N/A'} {tournament.tournamentTime || ''}
                      <br />
                      <strong>Entry Fee:</strong> Rs. {tournament.entryFee}
                      <br />
                      <strong>Prize Pool:</strong> Rs. {tournament.prizePool}
                      <br />
                      <strong>Participants:</strong> {tournament.participants?.length || 0} / {tournament.maxParticipants}
                    </Card.Text>
                    
                    {tournament.status === 'upcoming' && !tournament.matchDetails && (
                      <div className="alert alert-info mt-3 mb-0 p-2">
                        <small className="d-block text-truncate" style={{ maxHeight: '60px', overflow: 'auto' }}>
                          <strong>Note:</strong> Tournament details will be updated closer to the start time.
                        </small>
                      </div>
                    )}
                    
                    {tournament.status === 'upcoming' && tournament.matchDetails && (
                      <div className="alert alert-info mt-3 mb-0 p-2">
                        <small className="d-block" style={{ maxHeight: '60px', overflow: 'auto' }}>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    {tournament.status === 'live' && tournament.matchDetails && (
                      <div className="alert alert-success mt-3 mb-0 p-2">
                        <small className="d-block" style={{ maxHeight: '60px', overflow: 'auto' }}>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-3">
                      <Button 
                        variant="outline-info" 
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        size="sm"
                        className="w-100"
                      >
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                  <Card.Footer className={`py-2 small ${tournament.status === 'live' ? 'bg-success text-white' : tournament.status === 'completed' ? 'bg-secondary text-white' : ''}`}>
                    {tournament.status === 'upcoming' ? 'Registration open' : tournament.status === 'live' ? 'Tournament in progress' : 'Tournament ended'}
                  </Card.Footer>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}
    </Container>
  );
}

export default MyTournaments;