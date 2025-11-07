import React from 'react';
import styled from 'styled-components';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const StrengthContainer = styled.div`
  margin-top: 0.5rem;
`;

const StrengthBar = styled.div<{ strength: number }>`
  height: 4px;
  border-radius: 2px;
  background: ${props => {
    if (props.strength === 0) return '#e5e7eb';
    if (props.strength === 1) return '#ef4444';
    if (props.strength === 2) return '#f59e0b';
    if (props.strength === 3) return '#eab308';
    return '#10b981';
  }};
  transition: all 0.3s ease;
  width: ${props => (props.strength / 4) * 100}%;
`;

const StrengthText = styled.div<{ strength: number }>`
  font-size: 0.75rem;
  margin-top: 0.25rem;
  color: ${props => {
    if (props.strength === 0) return '#6b7280';
    if (props.strength === 1) return '#ef4444';
    if (props.strength === 2) return '#f59e0b';
    if (props.strength === 3) return '#eab308';
    return '#10b981';
  }};
`;

const RequirementsList = styled.ul`
  font-size: 0.75rem;
  margin: 0.5rem 0 0 0;
  padding: 0;
  list-style: none;
`;

const Requirement = styled.li.withConfig({
  shouldForwardProp: (prop) => prop !== 'met',
})<{ met: boolean }>`
  color: ${props => props.met ? '#10b981' : '#6b7280'};
  margin: 0.25rem 0;
  
  &:before {
    content: '${props => props.met ? '✓' : '○'}';
    margin-right: 0.5rem;
  }
`;

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const calculateStrength = (pwd: string): number => {
    let strength = 0;
    
    // Length check
    if (pwd.length >= 8) strength++;
    
    // Uppercase check
    if (/[A-Z]/.test(pwd)) strength++;
    
    // Lowercase check
    if (/[a-z]/.test(pwd)) strength++;
    
    // Number check
    if (/\d/.test(pwd)) strength++;
    
    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength++;
    
    return Math.min(strength, 4);
  };

  const getStrengthText = (strength: number): string => {
    switch (strength) {
      case 0: return 'Enter password';
      case 1: return 'Very weak';
      case 2: return 'Weak';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  };

  const strength = calculateStrength(password);
  const requirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', met: /[a-z]/.test(password) },
    { text: 'One number', met: /\d/.test(password) },
    { text: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) }
  ];

  return (
    <StrengthContainer>
      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px' }}>
        <StrengthBar strength={strength} />
      </div>
      <StrengthText strength={strength}>
        {getStrengthText(strength)}
      </StrengthText>
      {password && (
        <RequirementsList>
          {requirements.map((req, index) => (
            <Requirement key={index} met={req.met}>
              {req.text}
            </Requirement>
          ))}
        </RequirementsList>
      )}
    </StrengthContainer>
  );
};