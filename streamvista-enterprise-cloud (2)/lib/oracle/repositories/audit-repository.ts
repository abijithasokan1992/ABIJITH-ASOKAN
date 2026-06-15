/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';
import crypto from 'crypto';

export interface AuditLogRecord {
  logId?: number;
  timestamp?: string;
  username: string;
  role: string;
  action: string;
  details: string;
  oracleHash?: string;
}

export interface NotificationRecord {
  notificationId?: number;
  recipientEmail: string;
  category: string;
  message: string;
  isRead: number;
  createdAt?: string;
}

export class AuditRepository {
  /**
   * Commits a deep trace audit block directly onto Oracle Autonomous DB tables.
   */
  async logAction(username: string, role: string, action: string, details: string): Promise<string> {
    const conn = await getConnection();
    
    // Simulate cryptographic chaining seal
    const payload = `${username}-${role}-${action}-${Date.now()}-${Math.random()}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    try {
      await conn.execute(
        `INSERT INTO audit_logs (username, role, action, details, oracle_hash) 
         VALUES (:username, :role, :action, :details, :hash)`,
        {
          username,
          role,
          action,
          details,
          hash
        }
      );
      return hash;
    } finally {
      await conn.close();
    }
  }

  /**
   * Retrieves log listings securely sorted chronological.
   */
  async getLogs(): Promise<AuditLogRecord[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT log_id, timestamp, username as user, role, action, details, oracle_hash 
         FROM audit_logs 
         ORDER BY timestamp DESC`
      );

      const rows = result.rows as any[];
      if (!rows) return [];

      return rows.map(r => ({
        logId: r.LOG_ID,
        timestamp: r.TIMESTAMP,
        username: r.USER,
        role: r.ROLE,
        action: r.ACTION,
        details: r.DETAILS,
        oracleHash: r.ORACLE_HASH
      }));
    } finally {
      await conn.close();
    }
  }

  /**
   * Commits an async event notification into user screens maps.
   */
  async addNotification(recipientEmail: string, category: string, message: string): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `INSERT INTO notifications (recipient_email, category, message, is_read) 
         VALUES (:recipientEmail, :category, :message, 0)`,
        { recipientEmail, category, message }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Hydrates unread alarms for active corporate sessions.
   */
  async getNotifications(recipientEmail: string): Promise<NotificationRecord[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT notification_id, recipient_email, category, message, is_read, created_at 
         FROM notifications 
         WHERE recipient_email = :recipientEmail 
         ORDER BY created_at DESC`,
        { recipientEmail }
      );

      const rows = result.rows as any[];
      if (!rows) return [];

      return rows.map(r => ({
        notificationId: r.NOTIFICATION_ID,
        recipientEmail: r.RECIPIENT_EMAIL,
        category: r.CATEGORY,
        message: r.MESSAGE,
        isRead: r.IS_READ,
        createdAt: r.CREATED_AT
      }));
    } finally {
      await conn.close();
    }
  }
}
