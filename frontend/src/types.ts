export type TransferStatus = 'Completed' | 'Pending' | 'Failed';

export interface Transfer {
  id: string;
  date: string;
  recipientName: string;
  recipientBank: string;
  sentAmount: number;
  receivedAmount: number;
  sentCurrency: 'MYR';
  receivedCurrency: 'PHP';
  status: TransferStatus;
  reference: string;
  fee: number;
}

export interface Recipient {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  lastSentAmount?: number;
  lastSentDate?: string;
  totalSent: number;
  paymentCount: number;
  initials: string;
  color: string;
}
