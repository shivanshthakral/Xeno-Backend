import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer.js';
import { env } from '../config/env.js';
import { firebaseAdmin } from '../config/firebase.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extract token from Cookie or Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token is missing. Access denied.');
    }

    // 2. Mock Firebase Token check for local development testing in Postman
    if (env.nodeEnv === 'development' && token.startsWith('mock-firebase-')) {
      // Expect format: mock-firebase-[UID]-[NAME]-[EMAIL]
      const parts = token.split('-');
      const uid = parts[2] || 'mock_fb_uid_123';
      const name = parts[3] || 'Mock Firebase User';
      const email = parts[4] || 'mock.firebase@example.com';

      let customer = await Customer.findOne({ firebaseUid: uid });
      if (!customer) {
        customer = await Customer.create({
          name,
          email,
          firebaseUid: uid,
          phone: '+15555555555',
          engagementScore: 10,
          segmentTags: ['FirebaseUser', 'Mock']
        });
        console.log(`[AUTH] Lazy provisioned mock Firebase customer: ${customer.email}`);
      }

      req.user = customer;
      return next();
    }

    // 3. Verify Local JWT
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      const customer = await Customer.findById(decoded.id);

      if (customer) {
        req.user = customer;
        return next();
      }
    } catch (localJwtError) {
      // Local JWT check failed, fallback to Firebase validation
    }

    // 4. Verify Firebase ID Token
    if (firebaseAdmin) {
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        
        let customer = await Customer.findOne({ firebaseUid: decodedToken.uid });
        if (!customer) {
          // Lazy provisioning: automatically create Customer if they login with Firebase first
          customer = await Customer.create({
            name: decodedToken.name || decodedToken.email.split('@')[0] || 'Firebase User',
            email: decodedToken.email,
            firebaseUid: decodedToken.uid,
            phone: decodedToken.phone_number || '',
            engagementScore: 20,
            segmentTags: ['FirebaseUser']
          });
          console.log(`[AUTH] Lazy provisioned Firebase customer: ${customer.email}`);
        }

        req.user = customer;
        return next();
      } catch (firebaseError) {
        throw new UnauthorizedError(`Firebase validation failed: ${firebaseError.message}`);
      }
    }

    // If both failed and firebaseAdmin is not active
    throw new UnauthorizedError('Invalid authentication token.');
  } catch (error) {
    next(error);
  }
};
export default authenticate;
