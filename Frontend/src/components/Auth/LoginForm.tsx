import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Card, 
  Button, 
  Input, 
  FormGroup, 
  Label, 
  ErrorMessage, 
  LoadingSpinner,
  Alert 
} from '../../styles/GlobalStyles';
import { validateInput, rateLimiter } from '../../utils/validation';
import { useSecurity } from '../SecurityProvider';

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .test('email-format', 'Invalid email format', (value) => 
      value ? validateInput(value, 'email') : false
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
});

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [rateLimitError, setRateLimitError] = useState<string>('');
  const { csrfToken } = useSecurity();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginError('');
    setRateLimitError('');

    // Rate limiting check
    if (!rateLimiter.isAllowed(data.email)) {
      setRateLimitError('Too many login attempts. Please try again in 15 minutes.');
      return;
    }

    setIsLoading(true);

    try {
      // Debug: log login attempt
      console.log('Login attempt for:', data.email);
      
      await onLogin({
        email: data.email,
        password: data.password
      });
      
      reset();
      console.log('Login successful!'); // Debug log
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#4f46e5' }}>
        Secure Login
      </h2>
      
      {rateLimitError && (
        <Alert type="error">
          {rateLimitError}
        </Alert>
      )}
      
      {loginError && (
        <Alert type="error">
          {loginError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" name="csrf_token" value={csrfToken} />
        
        <FormGroup>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            hasError={!!errors.email}
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <ErrorMessage>
              ⚠️ {errors.email.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            hasError={!!errors.password}
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <ErrorMessage>
              ⚠️ {errors.password.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <Button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {isLoading ? (
            <>
              <LoadingSpinner /> Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            Don't have an account?
          </p>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onSwitchToRegister}
            style={{ width: '100%' }}
          >
            Create Account
          </Button>
        </div>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ color: '#495057', marginBottom: '0.5rem' }}>🔒 Security Features:</h4>
        <ul style={{ color: '#6c757d', fontSize: '14px', paddingLeft: '1rem' }}>
          <li>Password hashing with bcrypt</li>
          <li>Rate limiting protection</li>
          <li>CSRF token validation</li>
          <li>Input sanitization</li>
          <li>SSL/HTTPS enforcement</li>
        </ul>
      </div>
    </Card>
  );
};