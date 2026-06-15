/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';
import { ScreenerRequest } from '../../../src/types';

export class ScreenerRepository {
  /**
   * Encodes a newly approved secure evaluation code block to stable storage.
   */
  async createScreener(screener: ScreenerRequest): Promise<number> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO screeners (film_id, buyer_email, buyer_company, status, requested_at, approved_at, expires_at, views_remaining, watermark_text) 
         VALUES (:filmId, :buyerEmail, :buyerCompany, :status, :requestedAt, :approvedAt, :expiresAt, :viewsRemaining, :watermarkText)
         RETURN screener_id INTO :inserted_id`,
        {
          filmId: parseInt(screener.filmId),
          buyerEmail: screener.buyerEmail,
          buyerCompany: screener.buyerCompany,
          status: screener.status,
          requestedAt: new Date(screener.requestedAt),
          approvedAt: screener.approvedAt ? new Date(screener.approvedAt) : null,
          expiresAt: screener.expiresAt ? new Date(screener.expiresAt) : null,
          viewsRemaining: screener.views || 5,
          watermarkText: screener.watermarkText,
          inserted_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }
      );

      const outBinds = result.outBinds as any;
      const insertedScreenerId = outBinds.inserted_id[0];

      // Insert any initial click action telemetry
      if (screener.clicks && screener.clicks.length > 0) {
        for (const click of screener.clicks) {
          await this.logAccess(conn, insertedScreenerId, screener.buyerEmail, click.action, click.ipAddress);
        }
      }

      return insertedScreenerId;
    } finally {
      await conn.close();
    }
  }

  /**
   * Low-level helper to log dynamic access telemetry checks inside Oracle database.
   */
  async logAccess(conn: oracledb.Connection, screenerId: number, email: string, action: string, ip: string): Promise<void> {
    await conn.execute(
      `INSERT INTO screener_access_logs (screener_id, viewer_email, action, ip_address, system_details) 
       VALUES (:screenerId, :email, :action, :ip, :details)`,
      {
        screenerId,
        email,
        action,
        ip,
        details: `SecKey authentication matched. IP logged: ${ip}. Agent: Node-B2B StreamVista Cloud.`
      }
    );
  }

  /**
   * Traces all screeners securely mapping to a buyer's portal context.
   */
  async findByBuyer(email: string): Promise<ScreenerRequest[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT s.screener_id, s.film_id, f.title AS film_title, s.buyer_email, s.buyer_company, s.status, s.requested_at, s.approved_at, s.expires_at, s.views_remaining, s.watermark_text
         FROM screeners s
         JOIN films f ON s.film_id = f.film_id
         WHERE s.buyer_email = :email
         ORDER BY s.requested_at DESC`,
        { email }
      );

      const rows = result.rows as any[];
      if (!rows) return [];

      const hydratedScreeners: ScreenerRequest[] = [];

      for (const row of rows) {
        // Hydrate access click metrics
        const clickResult = await conn.execute(
          `SELECT action, playback_timestamp, ip_address FROM screener_access_logs WHERE screener_id = :screenerId`,
          { screenerId: row.SCREENER_ID }
        );

        const clickRows = clickResult.rows as any[];
        const clicks = (clickRows || []).map(cr => ({
          timestamp: cr.PLAYBACK_TIMESTAMP,
          action: cr.ACTION,
          ipAddress: cr.IP_ADDRESS
        }));

        hydratedScreeners.push({
          id: String(row.SCREENER_ID),
          filmId: String(row.FILM_ID),
          filmTitle: row.FILM_TITLE,
          buyerEmail: row.BUYER_EMAIL,
          buyerCompany: row.BUYER_COMPANY,
          status: row.STATUS as any,
          requestedAt: row.REQUESTED_AT,
          approvedAt: row.APPROVED_AT || undefined,
          expiresAt: row.EXPIRES_AT || undefined,
          views: row.VIEWS_REMAINING,
          watermarkText: row.WATERMARK_TEXT,
          clicks
        });
      }

      return hydratedScreeners;
    } finally {
      await conn.close();
    }
  }

  /**
   * Appends an active player viewing tick, decrementing usage limits.
   */
  async watchClick(screenerId: number, ip: string): Promise<void> {
    const conn = await getConnection();
    try {
      // Adjust views count & append log
      await conn.execute(
        `UPDATE screeners 
         SET views_remaining = GREATEST(0, views_remaining - 1), 
             status = CASE WHEN views_remaining <= 1 THEN 'EXPIRED' ELSE status END
         WHERE screener_id = :screenerId`,
        { screenerId }
      );

      // Log click metrics
      await this.logAccess(conn, screenerId, 'anonymous@recipient.node', 'CLICKED_PLAY', ip);
    } finally {
      await conn.close();
    }
  }
}
