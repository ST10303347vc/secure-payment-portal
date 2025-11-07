import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Alert,
  Grid,
  LoadingSpinner
} from '../../styles/GlobalStyles';
import { PaymentForm } from '../Payment/PaymentForm';
import { SecureStorage } from '../../utils/security';
import { apiService } from '../../services/api';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  accountNumber: string;
}

interface PaymentTransaction {
  id: string;
  recipientName: string;
  amount: string;
  currency: string;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  date: string;
  failureReason?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'history'>('overview');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Debug: Log user data on component mount
  console.log('Dashboard loaded for user:', user);
  
  // TODO: Add real-time notifications for payment updates
  // TODO: Implement transaction filtering and search
  // FIXME: Loading states could be more granular

  useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      try {
        const resp = await apiService.getPayments();
        const payments = (resp.data || resp) as any[];
        const mapped: PaymentTransaction[] = payments.map(p => ({
          id: p.transactionId || p._id,
          recipientName: p.recipientName,
          amount: String(p.amount),
          currency: p.currency,
          reference: p.reference,
          status: p.status,
          date: p.createdAt,
          failureReason: p.failureReason || undefined,
        }));
        setTransactions(mapped);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPayments();
  }, []);

  const handlePaymentSubmit = async (paymentData: any) => {
    setIsLoading(true);
    console.log('Submitting payment:', paymentData);
    try {
      // Map frontend form keys to backend expected payload keys
      const payload = {
        recipientName: paymentData.recipientName,
        recipientEmail: String(paymentData.recipientEmail).toLowerCase().trim(),
        recipientIBAN: String(paymentData.recipientIban || '')
          .replace(/\s/g, '')
          .toUpperCase(),
        recipientSWIFT: String(paymentData.recipientSwift || '')
          .toUpperCase()
          .trim(),
        recipientAddress: paymentData.recipientAddress,
        recipientCity: paymentData.recipientCity,
        recipientCountry: paymentData.recipientCountry,
        amount: String(paymentData.amount),
        currency: String(paymentData.currency).toUpperCase(),
        reference: paymentData.reference,
        purpose: paymentData.purpose,
      };

      await apiService.createPayment(payload);
      const resp = await apiService.getPayments();
      const payments = (resp.data || resp) as any[];
      const mapped: PaymentTransaction[] = payments.map(p => ({
        id: p.transactionId || p._id,
        recipientName: p.recipientName,
        amount: String(p.amount),
        currency: p.currency,
        reference: p.reference,
        status: p.status,
        date: p.createdAt,
        failureReason: p.failureReason || undefined,
      }));
      setTransactions(mapped);
      setSuccessMessage('Payment submitted successfully!');
      setActiveTab('history');
      setTimeout(() => setSuccessMessage(''), 5000);
  } catch (error) {
      console.error('Payment submission failed:', error);
      // Preserve original error object so PaymentForm can read server-provided details
      throw error;
  } finally {
      setIsLoading(false);
  }
  };

  const handleLogout = () => {
    // Clear all session data
    SecureStorage.removeItem('currentUser');
    SecureStorage.removeItem('authToken');
    SecureStorage.removeItem('transactions');
    
    // Debug: Log logout event
    console.log('User logged out at:', new Date().toISOString());
    
    onLogout();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'failed': return '#dc3545';
      case 'cancelled': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* Header */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#4f46e5', marginBottom: '0.5rem' }}>
              Welcome, {user.firstName} {user.lastName}
            </h1>
            <p style={{ color: '#6c757d' }}>
              Account: {user.accountNumber} | {user.email}
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </Card>

      {/* Success Message */}
      {successMessage && (
        <Alert type="success">
          ✅ {successMessage}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e9ecef', paddingBottom: '1rem' }}>
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'payment' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('payment')}
          >
            New Payment
          </Button>
          <Button
            variant={activeTab === 'history' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('history')}
          >
            Transaction History
          </Button>
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Grid columns={2}>
          <Card>
            <h3 style={{ color: '#495057', marginBottom: '1rem' }}>Account Summary</h3>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Account Holder:</strong> {user.firstName} {user.lastName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Account Number:</strong> {user.accountNumber}</p>
              <p><strong>Account Type:</strong> International Transfer Account</p>
              <p><strong>Status:</strong> <span style={{ color: '#28a745' }}>Active</span></p>
            </div>
          </Card>

          <Card>
            <h3 style={{ color: '#495057', marginBottom: '1rem' }}>Recent Activity</h3>
            {transactions.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '2rem' }}>
                No transactions yet. Start by making your first payment!
              </p>
            ) : (
              <div>
                {transactions.slice(0, 3).map(transaction => (
                  <div 
                    key={transaction.id}
                    style={{ 
                      padding: '0.75rem', 
                      borderBottom: '1px solid #e9ecef',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: '600' }}>
                        {transaction.recipientName}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                        {transaction.reference}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: '600' }}>
                        {transaction.amount} {transaction.currency}
                      </p>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '12px', 
                        color: getStatusColor(transaction.status),
                        fontWeight: '600'
                      }}>
                        {transaction.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
                {transactions.length > 3 && (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Button 
                      variant="secondary" 
                      onClick={() => setActiveTab('history')}
                    >
                      View All Transactions
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Grid>
      )}

      {activeTab === 'payment' && (
        <PaymentForm 
          onSubmitPayment={handlePaymentSubmit}
          userEmail={user.email}
        />
      )}

      {activeTab === 'history' && (
        <Card>
          <h3 style={{ color: '#495057', marginBottom: '1.5rem' }}>Transaction History</h3>
          
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#6c757d', fontSize: '18px', marginBottom: '1rem' }}>
                No transactions found
              </p>
              <Button onClick={() => setActiveTab('payment')}>
                Make Your First Payment
              </Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#495057' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#495057' }}>Recipient</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#495057' }}>Reference</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#495057' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#495057' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#495057' }}>Transaction ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#495057' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '1rem', color: '#6c757d' }}>
                        {formatDate(transaction.date)}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        {transaction.recipientName}
                      </td>
                      <td style={{ padding: '1rem', color: '#6c757d' }}>
                        {transaction.reference}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'white',
                          backgroundColor: getStatusColor(transaction.status)
                        }}>
                          {transaction.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', color: '#6c757d' }}>
                        {transaction.id}
                      </td>
                      <td style={{ padding: '1rem', color: '#6c757d' }}>
                        {(transaction as any).reason || (transaction as any).failureReason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Security Notice */}
      <Card>
        <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '8px', border: '1px solid #c3e6c3' }}>
          <h4 style={{ color: '#155724', marginBottom: '0.5rem' }}>🔒 Security Information</h4>
          <p style={{ color: '#155724', fontSize: '14px', margin: 0 }}>
            Your session is secured with encryption, CSRF protection, and rate limiting. 
            All payment data is validated and sanitized. Always verify recipient details before confirming payments.
          </p>
        </div>
      </Card>
    </div>
  );
};