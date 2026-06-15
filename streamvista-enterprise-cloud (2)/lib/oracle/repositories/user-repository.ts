/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';

export interface UserDB {
  userId?: number;
  email: string;
  passwordHash: string;
  roleId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatorProfileDB {
  profileId?: number;
  userId: number;
  companyName: string;
  contactName: string;
  website?: string;
  catalogSize?: number;
  verifiedStatus: string;
}

export interface BuyerProfileDB {
  profileId?: number;
  userId: number;
  companyName: string;
  contactName: string;
  website?: string;
  acquisitionBudget?: number;
  verifiedStatus: string;
}

export class UserRepository {
  /**
   * Fetches an active user by their email.
   */
  async findByEmail(email: string): Promise<UserDB | null> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT user_id, email, password_hash, role_id, status, created_at, updated_at 
         FROM users WHERE email = :email`,
        { email }
      );
      
      const rows = result.rows as any[];
      if (!rows || rows.length === 0) return null;
      
      const row = rows[0];
      return {
        userId: row.USER_ID,
        email: row.EMAIL,
        passwordHash: row.PASSWORD_HASH,
        roleId: row.ROLE_ID,
        status: row.STATUS,
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT
      };
    } finally {
      await conn.close();
    }
  }

  /**
   * Registers a new partner login account.
   */
  async createUser(user: UserDB): Promise<number> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO users (email, password_hash, role_id, status) 
         VALUES (:email, :passwordHash, :roleId, 'ACTIVE')
         RETURN user_id INTO :inserted_id`,
        {
          email: user.email,
          passwordHash: user.passwordHash,
          roleId: user.roleId,
          inserted_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }
      );
      
      const outBinds = result.outBinds as any;
      return outBinds.inserted_id[0];
    } finally {
      await conn.close();
    }
  }

  /**
   * Commits the registration profile parameters for a Creator Studio.
   */
  async createCreatorProfile(profile: CreatorProfileDB): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO creator_profiles (user_id, company_name, contact_name, website, catalog_size, verified_status) 
         VALUES (:userId, :companyName, :contactName, :website, :catalogSize, :verifiedStatus)`,
        {
          userId: profile.userId,
          companyName: profile.companyName,
          contactName: profile.contactName,
          website: profile.website || null,
          catalogSize: profile.catalogSize || 0,
          verifiedStatus: profile.verifiedStatus
        }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Commits the acquisition profile specifications for a Buyer Distributor.
   */
  async createBuyerProfile(profile: BuyerProfileDB): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO buyer_profiles (user_id, company_name, contact_name, website, acquisition_budget, verified_status) 
         VALUES (:userId, :companyName, :contactName, :website, :acquisitionBudget, :verifiedStatus)`,
        {
          userId: profile.userId,
          companyName: profile.companyName,
          contactName: profile.contactName,
          website: profile.website || null,
          acquisitionBudget: profile.acquisitionBudget || 0,
          verifiedStatus: profile.verifiedStatus
        }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Updates verification status for a corporate context profile.
   */
  async updateVerificationStatus(role: 'CREATOR' | 'BUYER', email: string, status: string): Promise<void> {
    const conn = await getConnection();
    try {
      const table = role === 'CREATOR' ? 'creator_profiles' : 'buyer_profiles';
      await conn.execute(
        `UPDATE ${table} p 
         SET p.verified_status = :status, p.updated_at = CURRENT_TIMESTAMP 
         WHERE p.user_id = (SELECT u.user_id FROM users u WHERE u.email = :email)`,
        { status, email }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Gets a fully hydrated B2B profiles list for administration review.
   */
  async getAllRegistrations(): Promise<any[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT u.email, u.role_id, c.company_name, c.contact_name, c.website, c.catalog_size, c.verified_status, c.created_at
         FROM users u
         JOIN creator_profiles c ON u.user_id = c.user_id
         UNION ALL
         SELECT u.email, u.role_id, b.company_name, b.contact_name, b.website, 0 AS catalog_size, b.verified_status, b.created_at
         FROM users u
         JOIN buyer_profiles b ON u.user_id = b.user_id`
      );
      
      const rows = result.rows as any[];
      if (!rows) return [];
      
      return rows.map(r => ({
        email: r.EMAIL,
        role: r.ROLE_ID,
        companyName: r.COMPANY_NAME,
        contactName: r.CONTACT_NAME,
        website: r.WEBSITE,
        catalogSize: r.CATALOG_SIZE || 'Unknown',
        verifiedStatus: r.VERIFIED_STATUS,
        createdAt: r.CREATED_AT
      }));
    } finally {
      await conn.close();
    }
  }
}
