import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

function Footer() {
  return (
    <footer className="text-light py-4 mt-5">
      <Container>
        <Row className="gy-4">
          <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
            <h5 className="mb-3">PUBG Tournaments</h5>
            <p className="text-muted">
              Join exciting tournaments for PUBG, 8 Ball Pool, and other multiplayer games.
            </p>
          </Col>
          <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
            <h5 className="mb-3">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/" className="text-light">Home</a></li>
              <li className="mb-2"><a href="/tournaments" className="text-light">Tournaments</a></li>
              <li className="mb-2"><a href="/login" className="text-light">Login</a></li>
              <li className="mb-2"><a href="/signup" className="text-light">Sign Up</a></li>
            </ul>
          </Col>
          <Col xs={12} sm={12} md={4}>
            <h5 className="mb-3">Contact Us</h5>
            <p className="text-muted">
              Email: sarmadnaeem222@gmail.com<br />
              {/* Discord: PUBGTournaments#1234 */}
            </p>
          </Col>
        </Row>
        <hr className="my-3 bg-secondary" />
        <Row>
          <Col className="text-center">
            <p className="mb-0 text-muted small">
              &copy; {new Date().getFullYear()} PUBG Tournaments. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;