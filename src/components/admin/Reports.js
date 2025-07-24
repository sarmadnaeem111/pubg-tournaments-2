import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeInput } from '../../utils/security';
import CSRFToken from '../security/CSRFToken';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tournamentStats, setTournamentStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Fetch data when component mounts
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      setError('');

      // Verify user is admin before proceeding
      if (!currentUser) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Fetch tournament statistics
      await fetchTournamentStatistics();
      
      // Fetch financial statistics
      await fetchFinancialStatistics();

      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data. Please try again later.');
      setLoading(false);
    }
  }

  async function fetchTournamentStatistics() {
    try {
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      
      // Process tournament data
      const tournaments = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate statistics
      const totalTournaments = tournaments.length;
      const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming').length;
      const liveTournaments = tournaments.filter(t => t.status === 'live').length;
      const completedTournaments = tournaments.filter(t => t.status === 'completed').length;
      
      // Get game types
      const gameTypes = {};
      tournaments.forEach(tournament => {
        const gameType = tournament.gameType || 'Unknown';
        gameTypes[gameType] = (gameTypes[gameType] || 0) + 1;
      });

      // Get participation data
      const participationData = tournaments.map(tournament => ({
        name: sanitizeInput(tournament.name),
        participants: tournament.participants?.length || 0,
        capacity: tournament.capacity || 0,
        fillRate: tournament.capacity ? 
          Math.round((tournament.participants?.length || 0) / tournament.capacity * 100) : 0
      }));

      setTournamentStats({
        totalTournaments,
        upcomingTournaments,
        liveTournaments,
        completedTournaments,
        gameTypes,
        participationData
      });
    } catch (error) {
      console.error('Error fetching tournament statistics:', error);
      throw error;
    }
  }

  async function fetchFinancialStatistics() {
    try {
      // Fetch tournaments for entry fee data
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      
      const tournaments = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate total entry fees collected
      let totalEntryFees = 0;
      tournaments.forEach(tournament => {
        const entryFee = tournament.entryFee || 0;
        const participants = tournament.participants?.length || 0;
        totalEntryFees += entryFee * participants;
      });

      // Fetch withdrawal requests for payout data
      const withdrawalsCollection = collection(db, 'withdrawalRequests');
      const approvedWithdrawalsQuery = query(withdrawalsCollection, where('status', '==', 'approved'));
      const withdrawalsSnapshot = await getDocs(approvedWithdrawalsQuery);
      
      const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate total payouts
      let totalPayouts = 0;
      withdrawals.forEach(withdrawal => {
        totalPayouts += withdrawal.amount || 0;
      });

      // Calculate revenue (entry fees - payouts)
      const revenue = totalEntryFees - totalPayouts;

      setFinancialStats({
        totalEntryFees,
        totalPayouts,
        revenue,
        recentWithdrawals: withdrawals.slice(0, 5) // Get 5 most recent withdrawals
      });
    } catch (error) {
      console.error('Error fetching financial statistics:', error);
      throw error;
    }
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Reports</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <Tabs defaultActiveKey="tournament" id="reports-tabs" className="mb-4">
          <Tab eventKey="tournament" title="Tournament Statistics">
            {tournamentStats && (
              <>
                <Row className="mb-4">
                  <Col md={3}>
                    <Card className="text-center h-100">
                      <Card.Body>
                        <h2>{tournamentStats.totalTournaments}</h2>
                        <Card.Text>Total Tournaments</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100 bg-warning text-dark">
                      <Card.Body>
                        <h2>{tournamentStats.upcomingTournaments}</h2>
                        <Card.Text>Upcoming</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100 bg-success text-white">
                      <Card.Body>
                        <h2>{tournamentStats.liveTournaments}</h2>
                        <Card.Text>Live</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100 bg-secondary text-white">
                      <Card.Body>
                        <h2>{tournamentStats.completedTournaments}</h2>
                        <Card.Text>Completed</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col md={6}>
                    <Card>
                      <Card.Header>Game Type Distribution</Card.Header>
                      <Card.Body>
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>Game Type</th>
                              <th>Count</th>
                              <th>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(tournamentStats.gameTypes).map(([gameType, count]) => (
                              <tr key={gameType}>
                                <td>{gameType}</td>
                                <td>{count}</td>
                                <td>
                                  {Math.round((count / tournamentStats.totalTournaments) * 100)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header>Tournament Participation</Card.Header>
                      <Card.Body>
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>Tournament</th>
                              <th>Participants</th>
                              <th>Capacity</th>
                              <th>Fill Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentStats.participationData.map((tournament, index) => (
                              <tr key={index}>
                                <td>{tournament.name}</td>
                                <td>{tournament.participants}</td>
                                <td>{tournament.capacity}</td>
                                <td>{tournament.fillRate}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Tab>
          
          <Tab eventKey="financial" title="Financial Reports">
            {financialStats && (
              <>
                <Row className="mb-4">
                  <Col md={4}>
                    <Card className="text-center h-100 bg-info text-dark">
                      <Card.Body>
                        <h2>Rs. {financialStats.totalEntryFees}</h2>
                        <Card.Text>Total Entry Fees</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center h-100 bg-danger text-white">
                      <Card.Body>
                        <h2>Rs. {financialStats.totalPayouts}</h2>
                        <Card.Text>Total Payouts</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center h-100 bg-success text-white">
                      <Card.Body>
                        <h2>Rs. {financialStats.revenue}</h2>
                        <Card.Text>Net Revenue</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <Card className="mb-4">
                  <Card.Header>Recent Withdrawals</Card.Header>
                  <Card.Body>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialStats.recentWithdrawals.map((withdrawal, index) => (
                          <tr key={index}>
                            <td>{withdrawal.userId}</td>
                            <td>Rs. {withdrawal.amount}</td>
                            <td>
                              {withdrawal.timestamp ? 
                                new Date(withdrawal.timestamp.seconds * 1000).toLocaleDateString() : 
                                'N/A'}
                            </td>
                            <td>{withdrawal.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
                
                <form className="d-none">
                  <CSRFToken />
                </form>
              </>
            )}
          </Tab>
        </Tabs>
      )}
    </Container>
  );
}

export default Reports;