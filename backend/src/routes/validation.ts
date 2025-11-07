import { Router, Request, Response } from 'express';
import { validateIBAN, validateSWIFT } from '../utils/validation';

const router = Router();

/**
 * @route   POST /api/validate/iban
 * @desc    Validate IBAN format
 * @access  Public
 */
router.post('/iban', (req: Request, res: Response): void => {
  const { iban } = (req.body as { iban?: string }) || {};
  if (!iban) {
    res.status(400).json({
      success: false,
      message: 'IBAN is required.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const isValid = validateIBAN(iban);
  if (!isValid) {
    res.status(400).json({
      success: false,
      message: 'Invalid IBAN format',
      error: 'INVALID_IBAN',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Valid IBAN',
    data: { valid: true },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   POST /api/validate/swift
 * @desc    Validate SWIFT/BIC code format
 * @access  Public
 */
router.post('/swift', (req: Request, res: Response): void => {
  const { swift } = (req.body as { swift?: string }) || {};
  if (!swift) {
    res.status(400).json({
      success: false,
      message: 'SWIFT code is required.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const isValid = validateSWIFT(swift);
  if (!isValid) {
    res.status(400).json({
      success: false,
      message: 'Invalid SWIFT code format',
      error: 'INVALID_SWIFT',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Valid SWIFT code',
    data: { valid: true },
    timestamp: new Date().toISOString(),
  });
});

export default router;