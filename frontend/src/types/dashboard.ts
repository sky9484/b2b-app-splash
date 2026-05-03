export type TransferStatus =
  | 'settled'
  | 'pending'
  | 'processing'
  | 'failed'
  | 'settlement_pending'
  | 'exchange_failed';

export interface Transfer {
  id: string;
  recipientName: string;
  recipientInitials: string;
  amountMYR: number;
  amountUSDT: number;
  status: TransferStatus;
  createdAt: string;
  reference: string;
  suiTxDigest?: string;
  suiExplorerUrl?: string;
  suiVisionUrl?: string;
  suiGasUsed?: string;
  hataOrderId?: string;
  hataTier?: 'sc_spot' | 'labuan_swap' | 'otc';
  errorMessage?: string;
}

export interface WalletBalance {
  myrFloat: number;
  usdtHeld: number;
  inTransit: number;
  totalMovedThisMonth: number;
  changePercent: number;
}

export interface DashboardStats {
  totalTransfers: number;
  settledCount: number;
  pendingCount: number;
  failedCount: number;
  avgSettlementMinutes: number;
}

export interface FxQuote {
  rate: string;
  usdtAmount: string;
  feeUsdt: string;
  expiresAt?: number;
}
