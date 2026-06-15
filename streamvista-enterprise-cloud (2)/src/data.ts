/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Film, NegotiatingDeal, ScreenerRequest, AuditLog, BridgeRegistration, VaultAsset } from './types';

export const INITIAL_FILMS: Film[] = [];

export const INITIAL_REGISTRATIONS: BridgeRegistration[] = [
  {
    id: 'r-201',
    role: 'CREATOR',
    companyName: 'Crayond Content Partner',
    contactName: 'Crayond Team',
    email: 'partner@crayond.com',
    website: 'https://crayond.com',
    catalogSize: '5-20 films',
    status: 'APPROVED',
    date: '2026-06-01T08:15:00Z',
    note: 'Premium content partner.'
  },
  {
    id: 'r-202',
    role: 'BUYER',
    companyName: 'StreamVista Marketplace Partner',
    contactName: 'Acquisitions Lead',
    email: 'buyer@streamvista.com',
    website: 'https://streamvista.cloud',
    catalogSize: 'Continental Distributor',
    status: 'APPROVED',
    date: '2026-06-01T10:20:00Z',
    note: 'Active enterprise buyer.'
  }
];

export const INITIAL_DEALS: NegotiatingDeal[] = [];

export const INITIAL_SCREENERS: ScreenerRequest[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-501',
    timestamp: '2026-06-13T06:45:12Z',
    user: 'admin@streamvista.com',
    role: 'ADMIN',
    action: 'STARTUP_VERIFICATION',
    details: 'Autonomous Database startup sequence successful. Mapped to StreamVista Operations secure endpoints.',
    oracleHash: 'b4a83e0c03da8b789efcfcc59fbc410298de3e40fd828ceb5bb2df45610ef39f'
  },
  {
    id: 'log-502',
    timestamp: '2026-06-13T06:30:10Z',
    user: 'admin@streamvista.com',
    role: 'ADMIN',
    action: 'VAULT_SYNC',
    details: 'Synchronized Object Storage indices with Autonomous tables. Mapped vault directory streams active.',
    oracleHash: '203fb71659b8be92f7ea89daefea398492049d97fcbce9cd321fe3ff0bbd603a'
  }
];

export const INITIAL_VAULT_ASSETS: VaultAsset[] = [];
