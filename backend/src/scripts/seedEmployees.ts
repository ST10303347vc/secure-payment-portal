import { User } from '../models/User';
import { getFirestoreDb, initializeFirebase } from '../config/firebase';
import { logger } from '../utils/logger';
import crypto from 'crypto';

function generateEmpAccount(): string {
  const prefix = 'EMP';
  const timestamp = Date.now().toString().slice(-6);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${rand}`;
}

async function ensureEmployee(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  phone: string
) {
  const existing = await User.findByEmail(email.toLowerCase());
  if (existing) {
    logger.info('Employee already exists', { email });
    return existing;
  }

  const created = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    phone,
    accountNumber: generateEmpAccount(),
    role: 'employee',
    isActive: true,
    isVerified: false,
  } as any);

  // Mark verified post-creation
  const updated = await User.updateById(created.id!, { isVerified: true } as any);
  return updated || created;
}

async function main() {
  try {
    // Initialize Firebase Admin and Firestore
    await initializeFirebase();
    getFirestoreDb();

    const employees: [string, string, string, string, string][] = [
      ['Emily', 'Roberts', 'emily.roberts@company.com', 'Passw0rd!Emp1', '+1-555-100-2000'],
      ['David', 'Chen', 'david.chen@company.com', 'Passw0rd!Emp2', '+1-555-100-2001'],
      ['Fatima', 'Khan', 'fatima.khan@company.com', 'Passw0rd!Emp3', '+1-555-100-2002'],
    ];

    for (const [firstName, lastName, email, password, phone] of employees) {
      const u = await ensureEmployee(firstName, lastName, email, password, phone);
      logger.info('Seeded employee', { id: u?.id, email: u?.email, accountNumber: u?.accountNumber });
      console.log(`Seeded employee: ${email}`);
    }
    console.log('Employee seeding complete.');
    process.exit(0);
  } catch (err) {
    logger.error('Employee seeding failed', err as any);
    console.error('Employee seeding failed', err);
    process.exit(1);
  }
}

main();