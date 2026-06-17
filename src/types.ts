export interface Business {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  bizId: string;
  name: string;
  price: number;
  stock: number;
  purchasePrice?: number;
  type?: 'income' | 'raw_material';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bizId: string;
  status: 'active' | 'suspended';
  phone?: string;
  pin?: string;
  googleEmail?: string;
  username?: string;
}

export interface CartItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'expense' | 'cash_count';
  amount: number;
  bizId: string;
  userId: string;
  time: string; // ISO Timestamp String
  items?: number; // Total items count for sale
  cart?: CartItem[];
  category?: string; // e.g., 'Fuel', 'Transport', 'Utilities', 'Stock', etc.
  details?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  time: string; // ISO timestamp string
  isAlert: boolean;
  bizId?: string | null;
}

export interface LogEditRequest {
  id: string;
  txId: string;
  bizId: string;
  userId: string;
  userName: string;
  originalData: {
    type: 'sale' | 'expense' | 'cash_count';
    amount: number;
    category?: string;
    details?: string;
  };
  proposedData: {
    amount: number;
    category?: string;
    details?: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  time: string; // ISO timestamp string
  adminMemo?: string;
}

export type OwnerTab = 'dashboard' | 'analytics' | 'businesses' | 'team' | 'logs' | 'settings';

export type UserRole = 'owner' | 'employee';

export interface CurrentUser {
  role: UserRole;
  id: string;
  name: string;
  roleTitle?: string;
  bizId?: string;
  status?: 'active' | 'suspended';
}
