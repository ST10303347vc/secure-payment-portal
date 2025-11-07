import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { GlobalStyle, Container, Header, Nav, Logo, Main, Footer } from './styles/GlobalStyles';
import { SecurityProvider } from './components/SecurityProvider';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Dashboard } from './components/Dashboard/Dashboard';
import { EmployeeLogin } from './components/Employee/EmployeeLogin';
import { EmployeeDashboard } from './components/Employee/EmployeeDashboard';
import { SecureStorage } from './utils/security';
import { apiService } from './services/api';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  accountNumber: string;
  role?: 'customer' | 'employee';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'employee'>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Set security headers
    document.title = 'Secure Payment Portal - International Transfers';
    
    // Add meta tags for security
    const metaTags = [
      { name: 'description', content: 'Secure international payment portal with advanced security features' },
      { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
      { httpEquiv: 'X-Frame-Options', content: 'DENY' },
      { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
      { name: 'referrer', content: 'strict-origin-when-cross-origin' }
    ];

    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      if (tag.name) meta.name = tag.name;
      if (tag.httpEquiv) meta.httpEquiv = tag.httpEquiv;
      meta.content = tag.content;
      document.head.appendChild(meta);
    });

    // Check for existing session
    const savedUser = SecureStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error loading user session:', error);
        SecureStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      const resp = await apiService.login(credentials.email, credentials.password);
      const { user, token } = resp.data;

      SecureStorage.setItem('authToken', token);
      SecureStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);
      setNotice(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Login failed.';
      if (msg.toLowerCase().includes('not verified')) {
        setNotice('Account is not verified. Please check your email for verification instructions, then log in.');
      } else {
        setNotice(msg);
      }
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      const resp = await apiService.register({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
      });
      const backendMsg = resp?.data?.message || 'Registration successful.';
      setNotice(`${backendMsg} Once verified, please log in.`);
      setAuthMode('login');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Registration failed.';
      setNotice(msg);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    SecureStorage.clear();
    setAuthMode('login');
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading Secure Payment Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <SecurityProvider>
      <Router>
        <GlobalStyle />
        
        <Header>
          <Container>
            <Nav>
              <Logo>🔒 SecurePay Portal</Logo>
              {isAuthenticated && currentUser && (
                <div style={{ color: '#4f46e5', fontWeight: '600' }}>
                  Welcome, {currentUser.firstName}
                </div>
              )}
              {!isAuthenticated && (
                authMode === 'employee' ? (
                  <button
                    onClick={() => setAuthMode('login')}
                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Customer Login
                  </button>
                ) : (
                  <button
                    onClick={() => setAuthMode('employee')}
                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Employee Login
                  </button>
                )
              )}
            </Nav>
          </Container>
        </Header>

        <Main>
          <Container>
            {isAuthenticated && currentUser ? (
              currentUser.role === 'employee' ? (
                <EmployeeDashboard user={currentUser as any} onLogout={handleLogout} />
              ) : (
                <Dashboard user={currentUser} onLogout={handleLogout} />
              )
            ) : (
              <div style={{ 
                maxWidth: '500px', 
                margin: '0 auto',
                padding: '2rem 0'
              }}>
                {notice && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#1f2937',
                    border: '1px solid #c7d2fe',
                    fontSize: '0.95rem'
                  }}>
                    {notice}
                  </div>
                )}
                {authMode === 'employee' ? (
                  <EmployeeLogin onLoggedIn={(user) => { setCurrentUser(user); setIsAuthenticated(true); }} />
                ) : authMode === 'login' ? (
                  <LoginForm 
                    onLogin={handleLogin}
                    onSwitchToRegister={() => setAuthMode('register')}
                  />
                ) : (
                  <RegisterForm 
                    onRegister={handleRegister}
                    onSwitchToLogin={() => setAuthMode('login')}
                  />
                )}
              </div>
            )}
          </Container>
        </Main>

        <Footer>
          <Container>
            <p>&copy; 2024 SecurePay Portal. All rights reserved. | Secured with SSL/TLS encryption</p>
          </Container>
        </Footer>
      </Router>
    </SecurityProvider>
  );
}

export default App;
