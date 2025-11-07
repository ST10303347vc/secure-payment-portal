import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Employee Login header', () => {
  render(<App />);
  const header = screen.getByText(/Employee Login/i);
  expect(header).toBeInTheDocument();
});
