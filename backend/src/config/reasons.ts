export const REASON_CODES: string[] = [
  'Insufficient docs',
  'AML flag',
  'Invalid recipient details',
  'Compliance hold',
  'Risk review',
  'Duplicate payment',
  'Funding issue'
];

export const isValidReasonCode = (code?: string): boolean => {
  if (!code) return false;
  const normalized = String(code).trim().toLowerCase();
  return REASON_CODES.some(c => c.toLowerCase() === normalized);
};