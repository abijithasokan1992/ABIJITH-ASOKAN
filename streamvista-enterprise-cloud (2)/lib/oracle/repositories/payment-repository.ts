/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';

export interface PaymentRecord {
  paymentId?: number;
  userId: number;
  userEmail: string;
  orderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: string; // CREATED, CAPTURED, FAILED
  planType: string; // Creator Monthly, Creator Annual, Buyer Monthly, Buyer Annual
  subscriptionType: string; // CR_MONTHLY, CR_ANNUAL, BY_MONTHLY, BY_ANNUAL
  timestamp?: string;
}

export class PaymentRepository {
  /**
   * Logs a pre-authorization order request context prior to payment execution.
   */
  async createOrderRecord(p: PaymentRecord): Promise<number> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO payments (user_id, user_email, order_id, amount, currency, status, plan_type, subscription_type) 
         VALUES (:userId, :userEmail, :orderId, :amount, :currency, :status, :planType, :subscriptionType)
         RETURN payment_id INTO :inserted_id`,
        {
          userId: p.userId,
          userEmail: p.userEmail,
          orderId: p.orderId,
          amount: p.amount,
          currency: p.currency,
          status: p.status, // e.g. 'CREATED'
          planType: p.planType,
          subscriptionType: p.subscriptionType,
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
   * Confirms payment legitimacy following Razorpay signature checks.
   */
  async capturePayment(orderId: string, razorpayPaymentId: string): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE payments 
         SET status = 'CAPTURED', razorpay_payment_id = :razorpayPaymentId, timestamp = CURRENT_TIMESTAMP 
         WHERE order_id = :orderId`,
        { razorpayPaymentId, orderId }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Marks payment attempts as failed.
   */
  async failPayment(orderId: string): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE payments 
         SET status = 'FAILED', timestamp = CURRENT_TIMESTAMP 
         WHERE order_id = :orderId`,
        { orderId }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Fetches active user subscription payment receipts history.
   */
  async findByUserEmail(email: string): Promise<PaymentRecord[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT payment_id, user_id, user_email, order_id, razorpay_payment_id, amount, currency, status, plan_type, subscription_type, timestamp 
         FROM payments 
         WHERE user_email = :email 
         ORDER BY timestamp DESC`,
        { email }
      );

      const rows = result.rows as any[];
      if (!rows) return [];

      return rows.map(r => ({
        paymentId: r.PAYMENT_ID,
        userId: r.USER_ID,
        userEmail: r.USER_EMAIL,
        orderId: r.ORDER_ID,
        razorpayPaymentId: r.RAZORPAY_PAYMENT_ID || undefined,
        amount: r.AMOUNT,
        currency: r.CURRENCY,
        status: r.STATUS,
        planType: r.PLAN_TYPE,
        subscriptionType: r.SUBSCRIPTION_TYPE,
        timestamp: r.TIMESTAMP
      }));
    } finally {
      await conn.close();
    }
  }
}
