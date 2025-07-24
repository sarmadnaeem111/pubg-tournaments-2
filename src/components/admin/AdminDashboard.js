import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function AdminDashboard() {
  return (
    <Container className="py-5">
      <h1 className="mb-4">Admin Dashboard</h1>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Tournament Management</Card.Title>
              <Card.Text>
                Create, edit, and manage tournaments for different games.
              </Card.Text>
              <Link to="/admin/tournaments">
                <Button variant="primary">Manage Tournaments</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>User Management</Card.Title>
              <Card.Text>
                View and manage user accounts and wallet balances.
              </Card.Text>
              <Link to="/admin/users">
                <Button variant="primary">Manage Users</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Recharge Requests</Card.Title>
              <Card.Text>
                Process user wallet recharge requests with payment proofs.
              </Card.Text>
              <Link to="/admin/recharges">
                <Button variant="primary">Manage Recharges</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Withdrawal Requests</Card.Title>
              <Card.Text>
                Process user withdrawal requests and manage payments.
              </Card.Text>
              <Link to="/admin/withdrawals">
                <Button variant="primary">Manage Withdrawals</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Reports</Card.Title>
              <Card.Text>
                View tournament statistics and financial reports.
              </Card.Text>
              <Link to="/admin/reports">
                <Button variant="primary">View Reports</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Payment Settings</Card.Title>
              <Card.Text>
                Configure payment account details for user transactions.
              </Card.Text>
              <Link to="/admin/payment-settings">
                <Button variant="primary">Configure Payments</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AdminDashboard;