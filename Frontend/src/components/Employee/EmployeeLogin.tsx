import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Card, Button, Input, FormGroup, Label, ErrorMessage, LoadingSpinner, Alert } from '../../styles/GlobalStyles';
import { validateInput, rateLimiter } from '../../utils/validation';
import { useSecurity } from '../SecurityProvider';
import { apiService } from '../../services/api';
import { SecureStorage } from '../../utils/security';

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .test('email-format', 'Invalid email format', (value) => value ? validateInput(value, 'email') : false),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
});

interface EmployeeLoginFormData {
  email: string;
  password: string;
}

interface EmployeeLoginProps {
  onLoggedIn: (user: any) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ onLoggedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [rateLimitError, setRateLimitError] = useState<string>('');
  const { csrfToken } = useSecurity();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<EmployeeLoginFormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data: EmployeeLoginFormData) => {
    setLoginError('');
    setRateLimitError('');

    if (!rateLimiter.isAllowed(`employee:${data.email}`)) {
      setRateLimitError('Too many login attempts. Please try again in 15 minutes.');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await apiService.login(data.email, data.password);
      const { user, token } = resp.data;

      // Ensure employee role
      if (user.role !== 'employee') {
        throw new Error('Access denied: not an employee account');
      }

      SecureStorage.setItem('authToken', token);
      SecureStorage.setItem('currentUser', JSON.stringify(user));
      reset();
      onLoggedIn(user);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#4f46e5' }}>
        Employee Login
      </h2>

      {rateLimitError && <Alert type="error">{rateLimitError}</Alert>}
      {loginError && <Alert type="error">{loginError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <FormGroup>
          <Label htmlFor="email">Corporate Email</Label>
          <Input id="email" type="email" placeholder="name@company.com" hasError={!!errors.email} autoComplete="email" {...register('email')} />
          {errors.email && <ErrorMessage>⚠️ {errors.email.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Enter your password" hasError={!!errors.password} autoComplete="current-password" {...register('password')} />
          {errors.password && <ErrorMessage>⚠️ {errors.password.message}</ErrorMessage>}
        </FormGroup>

        <Button type="submit" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? (<><LoadingSpinner /> Signing In...</>) : ('Sign In')}
        </Button>

        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: '13px', color: '#374151', marginBottom: '0.5rem' }}>
            <strong>Seeded Employee (for local testing):</strong>
            <div>Email: <code>emily.roberts@company.com</code></div>
            <div>Password: <code>Passw0rd!Emp1</code></div>
          </div>
          <button
            type="button"
            onClick={() => { setValue('email', 'emily.roberts@company.com'); setValue('password', 'Passw0rd!Emp1'); }}
            style={{
              background: 'transparent',
              color: '#4f46e5',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            Prefill these credentials
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ color: '#495057', marginBottom: '0.5rem' }}>🔒 Security Features:</h4>
        <ul style={{ color: '#6c757d', fontSize: '14px', paddingLeft: '1rem' }}>
          <li>Rate limiting protection</li>
          <li>CSRF token validation</li>
          <li>Input sanitization</li>
          <li>JWT-based sessions</li>
        </ul>
      </div>
    </Card>
  );
};