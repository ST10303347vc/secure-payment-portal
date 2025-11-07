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
  Alert,
  Grid
} from '../../styles/GlobalStyles';
import { validateInput, rateLimiter } from '../../utils/validation';
import { PasswordStrengthIndicator } from '../common/PasswordStrengthIndicator';
import { useSecurity } from '../SecurityProvider';

// TODO: Add phone number validation for different countries
// FIXME: Terms acceptance validation could be more user-friendly

const schema = yup.object().shape({
  firstName: yup
    .string()
    .required('First name is required')
    .test('name-format', 'Invalid name format', (value) => 
      value ? validateInput(value, 'name') : false
    ),
  lastName: yup
    .string()
    .required('Last name is required')
    .test('name-format', 'Invalid name format', (value) => 
      value ? validateInput(value, 'name') : false
    ),
  email: yup
    .string()
    .required('Email is required')
    .test('email-format', 'Invalid email format', (value) => 
      value ? validateInput(value, 'email') : false
    ),
  phone: yup
    .string()
    .required('Phone number is required')
    .test('phone-format', 'Invalid phone number format', (value) => 
      value ? validateInput(value, 'phone') : false
    ),
  password: yup
    .string()
    .required('Password is required')
    .test('password-format', 'Password must be at least 8 characters with uppercase, lowercase, number and special character', (value) => 
      value ? validateInput(value, 'password') : false
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  accountNumber: yup
    .string()
    .required('Account number is required')
    .test('account-format', 'Invalid account number format', (value) => 
      value ? validateInput(value, 'accountNumber') : false
    ),
  termsAccepted: yup
    .boolean()
    .required('You must accept the terms and conditions')
    .oneOf([true], 'You must accept the terms and conditions')
});

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  accountNumber: string;
  termsAccepted: boolean;
}

interface RegisterFormProps {
  onRegister: (userData: Omit<RegisterFormData, 'confirmPassword' | 'termsAccepted'>) => Promise<void>;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onSwitchToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string>('');
  const [rateLimitError, setRateLimitError] = useState<string>('');
  const { csrfToken } = useSecurity();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      termsAccepted: false,
    }
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setRegisterError('');
    setRateLimitError('');

    // Rate limiting check
    if (!rateLimiter.isAllowed(data.email)) {
      setRateLimitError('Too many registration attempts. Please try again in 15 minutes.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Registration attempt:', data.email, data.firstName); // Debug
      
      const { confirmPassword, termsAccepted, ...userData } = data;
      
      await onRegister({
        ...userData
      });
      
      // Debug: Registration successful
      console.log('User registered successfully!');
      reset();
    } catch (error) {
      console.error('Registration failed:', error); // Debug log
      setRegisterError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength(password || '');

  return (
    <Card>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#4f46e5' }}>
        Create Secure Account
      </h2>
      
      {rateLimitError && (
        <Alert type="error">
          {rateLimitError}
        </Alert>
      )}
      
      {registerError && (
        <Alert type="error">
          {registerError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" name="csrf_token" value={csrfToken} />
        
        <Grid columns={2}>
          <FormGroup>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter your first name"
              hasError={!!errors.firstName}
              autoComplete="given-name"
              {...register('firstName')}
            />
            {errors.firstName && (
              <ErrorMessage>
                ⚠️ {errors.firstName.message}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Enter your last name"
              hasError={!!errors.lastName}
              autoComplete="family-name"
              {...register('lastName')}
            />
            {errors.lastName && (
              <ErrorMessage>
                ⚠️ {errors.lastName.message}
              </ErrorMessage>
            )}
          </FormGroup>
        </Grid>

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
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            hasError={!!errors.phone}
            autoComplete="tel"
            {...register('phone')}
          />
          {errors.phone && (
            <ErrorMessage>
              ⚠️ {errors.phone.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            type="text"
            placeholder="Enter your account number"
            hasError={!!errors.accountNumber}
            autoComplete="off"
            {...register('accountNumber')}
          />
          {errors.accountNumber && (
            <ErrorMessage>
              ⚠️ {errors.accountNumber.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            hasError={!!errors.password}
            autoComplete="new-password"
            {...register('password')}
          />
          <PasswordStrengthIndicator password={watch('password') || ''} />
          {password && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ 
                height: '4px', 
                background: '#e9ecef', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${(passwordStrength.strength / 5) * 100}%`,
                  background: passwordStrength.color,
                  transition: 'all 0.3s ease'
                }} />
              </div>
              <small style={{ color: passwordStrength.color, fontSize: '12px' }}>
                {passwordStrength.label}
              </small>
            </div>
          )}
          {errors.password && (
            <ErrorMessage>
              ⚠️ {errors.password.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            hasError={!!errors.confirmPassword}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <ErrorMessage>
              ⚠️ {errors.confirmPassword.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              id="termsAccepted"
              type="checkbox"
              style={{ marginTop: '0.25rem' }}
              {...register('termsAccepted')}
            />
            <Label htmlFor="termsAccepted" style={{ margin: 0, cursor: 'pointer' }}>
              I accept the Terms and Conditions and Privacy Policy
            </Label>
          </div>
          {errors.termsAccepted && (
            <ErrorMessage>
              ⚠️ {errors.termsAccepted.message}
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
              <LoadingSpinner /> Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            Already have an account?
          </p>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onSwitchToLogin}
            style={{ width: '100%' }}
          >
            Sign In
          </Button>
        </div>
      </form>
    </Card>
  );
};