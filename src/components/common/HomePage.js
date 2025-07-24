import React, { Suspense, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Carousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Import placeholder image
import heroPlaceholder from '../../assets/hero-background-optimized.jpg';


function HomePage() {
  const { currentUser } = useAuth();
  const [heroLoaded, setHeroLoaded] = useState(false);
  
  // Preload the hero background image
  useEffect(() => {
    const img = new Image();
    img.src = require('../../assets/hero-background-optimized.jpg');
    img.onload = () => {
      // Once the image is loaded, update the CSS variable
      document.documentElement.style.setProperty(
        '--hero-background', 
        `url(${img.src})`
      );
      setHeroLoaded(true);
    };
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-dark text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col xs={12} md={6} className="mb-4 mb-md-0">
              <h1 className="display-4 fw-bold">PUBG Tournaments</h1>
              <p className="lead">
                Join exciting tournaments for PUBG, 8 Ball Pool, and other multiplayer games.
                Compete with players worldwide and win amazing prizes!
              </p>
              <div className="d-flex flex-wrap gap-2 gap-md-3 mt-4">
                <Link to="/tournaments" className="mb-2 mb-md-0">
                  <Button variant="primary" size="lg" className="w-100">Browse Tournaments</Button>
                </Link>
                {!currentUser && (
                  <Link to="/signup" className="mb-2 mb-md-0">
                    <Button variant="outline-light" size="lg" className="w-100">Sign Up</Button>
                  </Link>
                )}
              </div>
            </Col>
            <Col md={6}>
              <div className="hero-image-container">
                {/* Placeholder with lazy-loaded image */}
                <img 
                  src={heroPlaceholder}
                  data-src={require('../../assets/hero-background-optimized.jpg')}
                  alt="PUBG Tournament" 
                  className={`img-fluid rounded shadow ${heroLoaded ? 'fade-in' : ''}`}
                  loading="eager"
                  width="600"
                  height="400"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Featured Tournaments */}
      <Container className="py-5">
        <h2 className="text-center mb-4">Featured Tournaments</h2>
        <Suspense fallback={<div className="text-center p-4">Loading tournaments...</div>}>
          <Carousel className="mb-5 tournament-carousel" interval={5000}>
          <Carousel.Item>
            <div className="d-flex justify-content-center">
              <div className="carousel-card-container" style={{ maxWidth: '800px' }}>
                <Card className="text-center">
                  <Card.Header as="h5">PUBG Mobile Championship</Card.Header>
                  <Card.Body>
                    <Card.Title>Rs. 500 Prize Pool</Card.Title>
                    <Card.Text>
                      Join our flagship PUBG Mobile tournament with players from around the world.
                      Squad mode, Erangel map, multiple rounds.
                    </Card.Text>
                    <Link to="/tournaments">
                      <Button variant="primary">View Details</Button>
                    </Link>
                  </Card.Body>
                  <Card.Footer className="bg-success text-white">LIVE NOW</Card.Footer>
                </Card>
              </div>
            </div>
          </Carousel.Item>
          <Carousel.Item>
            <div className="d-flex justify-content-center">
              <div className="carousel-card-container" style={{ maxWidth: '800px' }}>
                <Card className="text-center">
                  <Card.Header as="h5">8 Ball Pool Masters</Card.Header>
                  <Card.Body>
                    <Card.Title>Rs. 200 Prize Pool</Card.Title>
                    <Card.Text>
                      Show off your skills in this 8 Ball Pool tournament.
                      Single elimination bracket, 1v1 matches.
                    </Card.Text>
                    <Link to="/tournaments">
                      <Button variant="primary">View Details</Button>
                    </Link>
                  </Card.Body>
                  <Card.Footer className="text-muted">Registration open</Card.Footer>
                </Card>
              </div>
            </div>
          </Carousel.Item>
          <Carousel.Item>
            <div className="d-flex justify-content-center">
              <div className="carousel-card-container" style={{ maxWidth: '800px' }}>
                <Card className="text-center">
                  <Card.Header as="h5">Free Fire Showdown</Card.Header>
                  <Card.Body>
                    <Card.Title>Rs. 300 Prize Pool</Card.Title>
                    <Card.Text>
                      Compete in our Free Fire tournament with custom rooms and special rules.
                      Squad mode, multiple maps.
                    </Card.Text>
                    <Link to="/tournaments">
                      <Button variant="primary">View Details</Button>
                    </Link>
                  </Card.Body>
                  <Card.Footer className="text-muted">Coming soon</Card.Footer>
                </Card>
              </div>
            </div>
          </Carousel.Item>
        </Carousel>
        </Suspense>

        {/* How It Works */}
        <h2 className="text-center mb-4">How It Works</h2>
        <Row className="mb-5">
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">1</h3>
                </div>
                <Card.Title>Sign Up</Card.Title>
                <Card.Text>
                  Create an account to get started. It&apos;s free and only takes a minute.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">2</h3>
                </div>
                <Card.Title>Join Tournaments</Card.Title>
                <Card.Text>
                  Browse available tournaments and join the ones you&apos;re interested in by paying the entry fee.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">3</h3>
                </div>
                <Card.Title>Compete & Win</Card.Title>
                <Card.Text>
                  Participate in the tournament at the scheduled time and compete for the prize pool.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Call to Action */}
        <div className="text-center py-4">
          <h3 className="mb-3">Ready to join the competition?</h3>
          <Link to="/tournaments">
            <Button variant="primary" size="lg">Browse All Tournaments</Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}

export default HomePage;