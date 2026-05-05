/**
 * Mock data for Splash Finance
 */
import { Transfer, Recipient } from './types';

const banks = ['BDO Unibank', 'BPI', 'Metrobank', 'UnionBank', 'Land Bank', 'GCash', 'PayMaya', 'PNB'];
const names = ['Juan Dela Cruz', 'Maria Santos', 'Jose Reyes', 'Ana Garcia', 'Carlos Mendoza', 'Sofia Torres', 'Miguel Ramos', 'Isabella Cruz', 'Roberto Bautista', 'Carmen Lim', 'Enrique Gil', 'Liza Soberano', 'Nadine Lustre', 'James Reid', 'Kathryn Bernardo', 'Daniel Padilla', 'Alden Richards', 'Maine Mendoza', 'Marian Rivera', 'Dingdong Dantes'];

const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Failed'];

export const MOCK_TRANSFERS: Transfer[] = Array.from({ length: 20 }).map((_, i) => {
  const sentAmount = Math.floor(Math.random() * 50000) + 100;
  const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 24) * 60 * 60 * 1000);
  
  return {
    id: `spl-${i + 1}`,
    date: date.toISOString(), // use string instead of format, we can format it in component
    recipientName: names[i],
    recipientBank: banks[Math.floor(Math.random() * banks.length)],
    sentAmount,
    receivedAmount: sentAmount * 12.9822,
    sentCurrency: 'MYR' as const,
    receivedCurrency: 'PHP' as const,
    status: statuses[Math.floor(Math.random() * statuses.length)] as any,
    reference: `SPL240${400 + i}`,
    fee: sentAmount * 0.012 + sentAmount * 0.002 + 4.5,
  };
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const MOCK_RECIPIENTS: Recipient[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    bank: 'BDO Unibank',
    accountNumber: '•••• 8847',
    lastSentAmount: 2500,
    lastSentDate: '22 Apr',
    totalSent: 18420,
    paymentCount: 12,
    initials: 'JD',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: '2',
    name: 'Maria Santos',
    bank: 'BPI',
    accountNumber: '•••• 1234',
    lastSentAmount: 1800,
    lastSentDate: '24 Apr',
    totalSent: 4500,
    paymentCount: 3,
    initials: 'MS',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    id: '3',
    name: 'Jose Reyes',
    bank: 'Metrobank',
    accountNumber: '•••• 5562',
    lastSentAmount: 12000,
    lastSentDate: '23 Apr',
    totalSent: 45000,
    paymentCount: 8,
    initials: 'JR',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: '4',
    name: 'Ana Garcia',
    bank: 'UnionBank',
    accountNumber: '•••• 9901',
    lastSentAmount: 2500,
    lastSentDate: '22 Apr',
    totalSent: 12000,
    paymentCount: 5,
    initials: 'AG',
    color: 'bg-green-100 text-green-600',
  },
];
