/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';
import { NegotiatingDeal } from '../../../src/types';

export class DealRepository {
  /**
   * Encodes a new bid proposal and saves the first B2B log trace.
   */
  async createOffer(deal: NegotiatingDeal): Promise<number> {
    const conn = await getConnection();
    try {
      const territoriesStr = deal.territories.join(',');
      const excNum = deal.exclusivity ? 1 : 0;

      const result = await conn.execute(
        `INSERT INTO deals (film_id, film_title, creator_email, buyer_email, buyer_company, rights_type, territories, exclusivity, duration_years, price, status) 
         VALUES (:filmId, :filmTitle, :creatorEmail, :buyerEmail, :buyerCompany, :rightsType, :territories, :exclusivity, :durationYears, :price, :status)
         RETURN deal_id INTO :inserted_id`,
        {
          filmId: parseInt(deal.filmId),
          filmTitle: deal.filmTitle,
          creatorEmail: deal.creatorEmail,
          buyerEmail: deal.buyerEmail,
          buyerCompany: deal.buyerCompany,
          rightsType: deal.rightsType,
          territories: territoriesStr,
          exclusivity: excNum,
          durationYears: deal.durationYears,
          price: deal.price,
          status: deal.status,
          inserted_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }
      );

      const outBinds = result.outBinds as any;
      const insertedDealId = outBinds.inserted_id[0];

      // Add corresponding historical step log
      if (deal.auditTrail && deal.auditTrail.length > 0) {
        const item = deal.auditTrail[0];
        await this.addAuditEntry(conn, insertedDealId, item.sender, item.senderName, item.action, item.price, item.note);
      }

      return insertedDealId;
    } finally {
      await conn.close();
    }
  }

  /**
   * Internal helper to write negotiation chronology rows to Oracle DB.
   */
  private async addAuditEntry(
    conn: oracledb.Connection,
    dealId: number,
    sender: string,
    senderName: string,
    action: string,
    price: number,
    note?: string
  ): Promise<void> {
    await conn.execute(
      `INSERT INTO negotiations (deal_id, sender, sender_name, action, price, note) 
       VALUES (:dealId, :sender, :senderName, :action, :price, :note)`,
      {
        dealId,
        sender,
        senderName,
        action,
        price,
        note: note || null
      }
    );
  }

  /**
   * Hydrates comprehensive historical transactions and live discussions.
   */
  async findDealsByParticipant(emailStr: string, role: 'CREATOR' | 'BUYER' | 'ADMIN'): Promise<NegotiatingDeal[]> {
    const conn = await getConnection();
    try {
      let query = `SELECT d.deal_id, d.film_id, d.film_title, d.creator_email, d.buyer_email, d.buyer_company, d.rights_type, d.territories, d.exclusivity, d.duration_years, d.price, d.status, d.oracle_contract_id, d.signed_at 
                   FROM deals d`;
      const binds: any = {};

      if (role === 'CREATOR') {
        query += ` WHERE d.creator_email = :email`;
        binds.email = emailStr;
      } else if (role === 'BUYER') {
        query += ` WHERE d.buyer_email = :email`;
        binds.email = emailStr;
      }
      query += ` ORDER BY d.updated_at DESC`;

      const result = await conn.execute(query, binds);
      const rows = result.rows as any[];
      if (!rows) return [];

      const hydratedDeals: NegotiatingDeal[] = [];

      for (const row of rows) {
        // Hydrate negotiations chronology feed
        const chronResult = await conn.execute(
          `SELECT sender, sender_name, action, price, note, timestamp 
           FROM negotiations WHERE deal_id = :dealId ORDER BY timestamp ASC`,
          { dealId: row.DEAL_ID }
        );

        const chronRows = chronResult.rows as any[];
        const auditTrail = (chronRows || []).map(cr => ({
          sender: cr.SENDER,
          senderName: cr.SENDER_NAME,
          action: cr.ACTION,
          price: cr.PRICE,
          timestamp: cr.TIMESTAMP,
          note: cr.NOTE || undefined
        }));

        // Fetch signatures if deal is accepted/executed
        const contractResult = await conn.execute(
          `SELECT creator_signature, buyer_signature, signed_date, ledger_index_id FROM contracts WHERE deal_id = :dealId`,
          { dealId: row.DEAL_ID }
        );
        const contractRows = contractResult.rows as any[];
        const doc = contractRows && contractRows.length > 0 ? contractRows[0] : null;

        hydratedDeals.push({
          id: String(row.DEAL_ID),
          filmId: String(row.FILM_ID),
          filmTitle: row.FILM_TITLE,
          creatorEmail: row.CREATOR_EMAIL,
          buyerEmail: row.BUYER_EMAIL,
          buyerCompany: row.BUYER_COMPANY,
          rightsType: row.RIGHTS_TYPE,
          territories: row.TERRITORIES ? row.TERRITORIES.split(',') : [],
          exclusivity: row.EXCLUSIVITY === 1,
          durationYears: row.DURATION_YEARS,
          price: row.PRICE,
          status: row.STATUS as any,
          auditTrail,
          oracleContractId: row.ORACLE_CONTRACT_ID || undefined,
          signedAt: row.SIGNED_AT || undefined,
          creatorSignature: doc ? doc.CREATOR_SIGNATURE : undefined,
          buyerSignature: doc ? doc.BUYER_SIGNATURE : undefined
        });
      }

      return hydratedDeals;
    } finally {
      await conn.close();
    }
  }

  /**
   * Submits a pricing adjustment counter block.
   */
  async submitCounterBid(
    dealId: number,
    price: number,
    senderRole: 'CREATOR' | 'BUYER',
    senderName: string,
    note?: string
  ): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE deals 
         SET price = :price, status = 'COUNTERED', updated_at = CURRENT_TIMESTAMP 
         WHERE deal_id = :dealId`,
        { price, dealId }
      );

      await this.addAuditEntry(conn, dealId, senderRole, senderName, 'COUNTER_PROPOSED', price, note);
    } finally {
      await conn.close();
    }
  }

  /**
   * Commits seller-buyer consent agreement parameters.
   */
  async acceptOffer(dealId: number, senderRole: 'CREATOR' | 'BUYER', senderName: string): Promise<void> {
    const conn = await getConnection();
    try {
      // Find current pricing indexes to log accurately
      const dealRes = await conn.execute(`SELECT price FROM deals WHERE deal_id = :dealId`, { dealId });
      const rows = dealRes.rows as any[];
      const price = rows && rows.length > 0 ? rows[0].PRICE : 0;

      await conn.execute(
        `UPDATE deals 
         SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP 
         WHERE deal_id = :dealId`,
        { dealId }
      );

      await this.addAuditEntry(conn, dealId, senderRole, senderName, 'OFFER_ACCEPTED', price, 'Licensing variables agreed. Staging final signature blocks.');
    } finally {
      await conn.close();
    }
  }

  /**
   * Electronically signs and executes an agreement block.
   */
  async signContract(
    dealId: number,
    role: 'CREATOR' | 'BUYER',
    nameSignature: string,
    executorEmail: string
  ): Promise<void> {
    const conn = await getConnection();
    try {
      // Fetch details of deal
      const dealRes = await conn.execute(`SELECT price, creator_email, buyer_email, status FROM deals WHERE deal_id = :dealId`, { dealId });
      const rows = dealRes.rows as any[];
      if (!rows || rows.length === 0) throw new Error('DEAL_NOT_FOUND');
      
      const dealInfo = rows[0];

      // Insert or Update contract signature registry table
      const countRes = await conn.execute(`SELECT COUNT(*) as cnt FROM contracts WHERE deal_id = :dealId`, { dealId });
      const countRows = countRes.rows as any[];
      const exists = countRows[0].CNT > 0;

      if (!exists) {
        const creatorSig = role === 'CREATOR' ? nameSignature : 'WAITING_FOR_SIGNATURE';
        const buyerSig = role === 'BUYER' ? nameSignature : 'WAITING_FOR_SIGNATURE';
        
        await conn.execute(
          `INSERT INTO contracts (deal_id, creator_signature, buyer_signature, contract_hash, ledger_index_id) 
           VALUES (:dealId, :creatorSig, :buyerSig, :hash, :ledgerId)`,
          {
            dealId,
            creatorSig,
            buyerSig,
            hash: `sha256_mock_${Math.random().toString(36).substring(7)}`,
            ledgerId: `oracle-ledger-block-${dealId}`
          }
        );
      } else {
        const valCol = role === 'CREATOR' ? 'creator_signature' : 'buyer_signature';
        await conn.execute(
          `UPDATE contracts SET ${valCol} = :signature WHERE deal_id = :dealId`,
          { signature: nameSignature, dealId }
        );
      }

      // Append ledger chronological record
      await this.addAuditEntry(conn, dealId, role, executorEmail, 'CONTRACT_SIGNED', dealInfo.PRICE, `Completed signing sequence on block. Entity sign verified: ${nameSignature}`);

      // If both side signatures are now logged, seal deal to EXECUTED
      const currentContractRes = await conn.execute(
        `SELECT creator_signature, buyer_signature FROM contracts WHERE deal_id = :dealId`,
        { dealId }
      );
      const docs = currentContractRes.rows as any[];
      if (docs && docs.length > 0) {
        const d = docs[0];
        if (d.CREATOR_SIGNATURE !== 'WAITING_FOR_SIGNATURE' && d.BUYER_SIGNATURE !== 'WAITING_FOR_SIGNATURE') {
          const contractReference = `tx_ora_${Math.random().toString(16).substring(2, 12)}de80892a`;
          await conn.execute(
            `UPDATE deals 
             SET status = 'EXECUTED', oracle_contract_id = :referenceId, signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE deal_id = :dealId`,
            { referenceId: contractReference, dealId }
          );

          await this.addAuditEntry(conn, dealId, 'SYSTEM', 'Ledger Integrity Center', 'CONTRACT_SIGNED', dealInfo.PRICE, `Mutual verification satisfied. Stamped Oracle Contract Reference ID: ${contractReference}`);
        }
      }
    } finally {
      await conn.close();
    }
  }
}
