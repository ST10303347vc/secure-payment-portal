import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Card, 
  Button, 
  Input, 
  Select,
  FormGroup, 
  Label, 
  ErrorMessage, 
  LoadingSpinner,
  Alert,
  Grid
} from '../../styles/GlobalStyles';
import { validateInput, rateLimiter } from '../../utils/validation';
import { useSecurity } from '../SecurityProvider';

// TODO: Add form validation library (Formik or react-hook-form)
// FIXME: Currency conversion rates should come from API

const schema = yup.object().shape({
  recipientName: yup
    .string()
    .required('Recipient name is required')
    .test('name-format', 'Invalid name format', (value) => 
      value ? validateInput(value, 'name') : false
    ),
  recipientEmail: yup
    .string()
    .required('Recipient email is required')
    .test('email-format', 'Invalid email format', (value) => 
      value ? validateInput(value, 'email') : false
    ),
  recipientIban: yup
    .string()
    .required('Recipient IBAN is required')
    .test('iban-format', 'Invalid IBAN format', (value) => 
      value ? validateInput(value, 'iban') : false
    ),
  recipientSwift: yup
    .string()
    .required('SWIFT/BIC code is required')
    .test('swift-format', 'Invalid SWIFT/BIC code format', (value) => 
      value ? validateInput(value, 'swiftCode') : false
    ),
  recipientAddress: yup
    .string()
    .required('Recipient address is required')
    .test('address-format', 'Invalid address format', (value) => 
      value ? validateInput(value, 'address') : false
    ),
  recipientCity: yup
    .string()
    .required('Recipient city is required')
    .test('city-format', 'Invalid city format', (value) => 
      value ? validateInput(value, 'city') : false
    ),
  recipientCountry: yup
    .string()
    .required('Recipient country is required')
    .test('country-format', 'Invalid country code', (value) => 
      value ? validateInput(value, 'countryCode') : false
    ),
  amount: yup
    .string()
    .required('Amount is required')
    .test('amount-format', 'Invalid amount format', (value) => 
      value ? validateInput(value, 'amount') : false
    )
    .test('amount-min', 'Minimum amount is 1.00', (value) => 
      value ? parseFloat(value) >= 1 : false
    )
    .test('amount-max', 'Maximum amount is 50000.00', (value) => 
      value ? parseFloat(value) <= 50000 : false
    ),
  currency: yup
    .string()
    .required('Currency is required')
    .test('currency-format', 'Invalid currency code', (value) => 
      value ? validateInput(value, 'currency') : false
    ),
  reference: yup
    .string()
    .required('Payment reference is required')
    .test('reference-format', 'Invalid reference format', (value) => 
      value ? validateInput(value, 'reference') : false
    ),
  purpose: yup
    .string()
    .required('Payment purpose is required')
});

interface PaymentFormData {
  recipientName: string;
  recipientEmail: string;
  recipientIban: string;
  recipientSwift: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string;
  amount: string;
  currency: string;
  reference: string;
  purpose: string;
}

interface PaymentFormProps {
  onSubmitPayment: (paymentData: PaymentFormData) => Promise<void>;
  userEmail: string;
}

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'PLN', name: 'Polish Złoty' }
];

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'ZA', name: 'South Africa' }
];

const paymentPurposes = [
  'Personal Transfer',
  'Business Payment',
  'Invoice Payment',
  'Salary Payment',
  'Investment',
  'Education',
  'Medical Expenses',
  'Family Support',
  'Property Purchase',
  'Other'
];

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmitPayment, userEmail }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [rateLimitError, setRateLimitError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData | null>(null);
  const { csrfToken } = useSecurity();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PaymentFormData>({
    resolver: yupResolver(schema)
  });

  const watchedAmount = watch('amount');
  const watchedCurrency = watch('currency');

  const onSubmit = async (data: PaymentFormData) => {
    setPaymentError('');
    setRateLimitError('');

    // Rate limiting check
    if (!rateLimiter.isAllowed(userEmail)) {
      setRateLimitError('Too many payment attempts. Please try again in 15 minutes.');
      return;
    }

    setFormData(data);
    setShowConfirmation(true);
  };

  const confirmPayment = async () => {
    if (!formData) return;

    setIsLoading(true);
    try {
      await onSubmitPayment(formData);
      reset();
      setShowConfirmation(false);
      setFormData(null);
    } catch (error) {
      // Display detailed backend validation errors if available
      const err = error as any;
      const baseMessage = err?.message || 'Payment failed. Please try again.';
      const details = err?.data?.errors;
      if (Array.isArray(details) && details.length > 0) {
        const combined = details.map((e: any) => `${e.field}: ${e.message}`).join('\n');
        setPaymentError(`${baseMessage}\n${combined}`);
      } else {
        setPaymentError(baseMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPayment = () => {
    setShowConfirmation(false);
    setFormData(null);
  };

  if (showConfirmation && formData) {
    return (
      <Card>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#4f46e5' }}>
          Confirm Payment
        </h2>
        
        <Alert type="warning">
          Please review your payment details carefully before confirming.
        </Alert>

        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <Grid columns={2}>
            <div>
              <h4 style={{ color: '#495057', marginBottom: '1rem' }}>Recipient Details</h4>
              <p><strong>Name:</strong> {formData.recipientName}</p>
              <p><strong>Email:</strong> {formData.recipientEmail}</p>
              <p><strong>IBAN:</strong> {formData.recipientIban}</p>
              <p><strong>SWIFT:</strong> {formData.recipientSwift}</p>
              <p><strong>Address:</strong> {formData.recipientAddress}</p>
              <p><strong>City:</strong> {formData.recipientCity}</p>
              <p><strong>Country:</strong> {countries.find(c => c.code === formData.recipientCountry)?.name}</p>
            </div>
            <div>
              <h4 style={{ color: '#495057', marginBottom: '1rem' }}>Payment Details</h4>
              <p><strong>Amount:</strong> {formData.amount} {formData.currency}</p>
              <p><strong>Reference:</strong> {formData.reference}</p>
              <p><strong>Purpose:</strong> {formData.purpose}</p>
            </div>
          </Grid>
        </div>

        {paymentError && (
          <Alert type="error">
            {paymentError}
          </Alert>
        )}

        <Grid columns={2}>
          <Button 
            variant="secondary" 
            onClick={cancelPayment}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner /> Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </Grid>
      </Card>
    );
  }

  return (
    <Card>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#4f46e5' }}>
        International Payment Transfer
      </h2>
      
      {rateLimitError && (
        <Alert type="error">
          {rateLimitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" name="csrf_token" value={csrfToken} />
        
        <h3 style={{ color: '#495057', marginBottom: '1rem', borderBottom: '2px solid #e9ecef', paddingBottom: '0.5rem' }}>
          Recipient Information
        </h3>

        <FormGroup>
          <Label htmlFor="recipientName">Recipient Full Name</Label>
          <Input
            id="recipientName"
            type="text"
            placeholder="Enter recipient's full name"
            hasError={!!errors.recipientName}
            {...register('recipientName')}
          />
          {errors.recipientName && (
            <ErrorMessage>
              ⚠️ {errors.recipientName.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="recipientEmail">Recipient Email</Label>
          <Input
            id="recipientEmail"
            type="email"
            placeholder="Enter recipient's email"
            hasError={!!errors.recipientEmail}
            {...register('recipientEmail')}
          />
          {errors.recipientEmail && (
            <ErrorMessage>
              ⚠️ {errors.recipientEmail.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <Grid columns={2}>
          <FormGroup>
            <Label htmlFor="recipientIban">IBAN</Label>
            <Input
              id="recipientIban"
              type="text"
              placeholder="GB29 NWBK 6016 1331 9268 19"
              hasError={!!errors.recipientIban}
              {...register('recipientIban')}
            />
            {errors.recipientIban && (
              <ErrorMessage>
                ⚠️ {errors.recipientIban.message}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="recipientSwift">SWIFT/BIC Code</Label>
            <Input
              id="recipientSwift"
              type="text"
              placeholder="NWBKGB2L"
              hasError={!!errors.recipientSwift}
              {...register('recipientSwift')}
            />
            {errors.recipientSwift && (
              <ErrorMessage>
                ⚠️ {errors.recipientSwift.message}
              </ErrorMessage>
            )}
          </FormGroup>
        </Grid>

        <FormGroup>
          <Label htmlFor="recipientAddress">Address</Label>
          <Input
            id="recipientAddress"
            type="text"
            placeholder="Enter recipient's address"
            hasError={!!errors.recipientAddress}
            {...register('recipientAddress')}
          />
          {errors.recipientAddress && (
            <ErrorMessage>
              ⚠️ {errors.recipientAddress.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <Grid columns={2}>
          <FormGroup>
            <Label htmlFor="recipientCity">City</Label>
            <Input
              id="recipientCity"
              type="text"
              placeholder="Enter city"
              hasError={!!errors.recipientCity}
              {...register('recipientCity')}
            />
            {errors.recipientCity && (
              <ErrorMessage>
                ⚠️ {errors.recipientCity.message}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="recipientCountry">Country</Label>
            <Select
              id="recipientCountry"
              hasError={!!errors.recipientCountry}
              {...register('recipientCountry')}
            >
              <option value="">Select country</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
            {errors.recipientCountry && (
              <ErrorMessage>
                ⚠️ {errors.recipientCountry.message}
              </ErrorMessage>
            )}
          </FormGroup>
        </Grid>

        <h3 style={{ color: '#495057', marginBottom: '1rem', marginTop: '2rem', borderBottom: '2px solid #e9ecef', paddingBottom: '0.5rem' }}>
          Payment Details
        </h3>

        <Grid columns={2}>
          <FormGroup>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              max="50000"
              placeholder="0.00"
              hasError={!!errors.amount}
              {...register('amount')}
            />
            {errors.amount && (
              <ErrorMessage>
                ⚠️ {errors.amount.message}
              </ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              hasError={!!errors.currency}
              {...register('currency')}
            >
              <option value="">Select currency</option>
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </Select>
            {errors.currency && (
              <ErrorMessage>
                ⚠️ {errors.currency.message}
              </ErrorMessage>
            )}
          </FormGroup>
        </Grid>

        {watchedAmount && watchedCurrency && (
          <Alert type="info">
            You are sending {watchedAmount} {watchedCurrency}
          </Alert>
        )}

        <FormGroup>
          <Label htmlFor="reference">Payment Reference</Label>
          <Input
            id="reference"
            type="text"
            placeholder="Enter payment reference"
            hasError={!!errors.reference}
            {...register('reference')}
          />
          {errors.reference && (
            <ErrorMessage>
              ⚠️ {errors.reference.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="purpose">Payment Purpose</Label>
          <Select
            id="purpose"
            hasError={!!errors.purpose}
            {...register('purpose')}
          >
            <option value="">Select purpose</option>
            {paymentPurposes.map(purpose => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </Select>
          {errors.purpose && (
            <ErrorMessage>
              ⚠️ {errors.purpose.message}
            </ErrorMessage>
          )}
        </FormGroup>

        <Button 
          type="submit" 
          style={{ width: '100%', marginTop: '1rem' }}
        >
          Review Payment
        </Button>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ color: '#495057', marginBottom: '0.5rem' }}>🔒 Security Notice:</h4>
        <ul style={{ color: '#6c757d', fontSize: '14px', paddingLeft: '1rem' }}>
          <li>All payment data is encrypted and validated</li>
          <li>CSRF protection is active</li>
          <li>Rate limiting prevents abuse</li>
          <li>All inputs are sanitized and validated</li>
        </ul>
      </div>
    </Card>
  );
};