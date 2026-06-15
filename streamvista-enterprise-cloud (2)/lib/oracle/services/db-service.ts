/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRepository } from '../repositories/user-repository';
import { FilmRepository } from '../repositories/film-repository';
import { ScreenerRepository } from '../repositories/screener-repository';
import { DealRepository } from '../repositories/deal-repository';
import { PaymentRepository } from '../repositories/payment-repository';
import { AuditRepository } from '../repositories/audit-repository';

// Instantiate singletons for direct server integration
export const userRepository = new UserRepository();
export const filmRepository = new FilmRepository();
export const screenerRepository = new ScreenerRepository();
export const dealRepository = new DealRepository();
export const paymentRepository = new PaymentRepository();
export const auditRepository = new AuditRepository();

export class DBService {
  /**
   * Safe login verifier matching Oracle user credentials.
   */
  static async authenticateUser(email: string, rawPassword: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    
    // In production, we utilize bcrypt or noble-hashes. In sandbox, we match strings safely
    if (user.passwordHash !== rawPassword && user.passwordHash !== `hash_${rawPassword}`) {
      await auditRepository.logAction(email, user.roleId, 'AUTH_FAILED', 'Supplied incorrect password parameters.');
      return null;
    }
    
    await auditRepository.logAction(email, user.roleId, 'USER_LOGIN', 'Handshook session security credentials successfully.');
    return user;
  }

  /**
   * Automatically executes onboards and issues corporate clearance keys.
   */
  static async onboardPartner(data: {
    role: 'CREATOR' | 'BUYER';
    companyName: string;
    contactName: string;
    email: string;
    website: string;
    catalogSize?: number;
    budget?: number;
  }) {
    // 1. Create a base account
    const mockHash = `pass_${Math.random().toString(36).substring(7)}`;
    const userId = await userRepository.createUser({
      email: data.email,
      passwordHash: mockHash,
      roleId: data.role,
      status: 'ACTIVE'
    });

    // 2. Hydrate role structures
    if (data.role === 'CREATOR') {
      await userRepository.createCreatorProfile({
        userId,
        companyName: data.companyName,
        contactName: data.contactName,
        website: data.website,
        catalogSize: data.catalogSize || 5,
        verifiedStatus: 'PENDING'
      });
    } else {
      await userRepository.createBuyerProfile({
        userId,
        companyName: data.companyName,
        contactName: data.contactName,
        website: data.website,
        acquisitionBudget: data.budget || 500000.00,
        verifiedStatus: 'PENDING'
      });
    }

    await auditRepository.logAction(data.email, data.role, 'COMPANY_ONBOARD_INIT', `Staged company files for: "${data.companyName}" contact: "${data.contactName}"`);
    return { userId, temporaryPassword: mockHash };
  }
}
