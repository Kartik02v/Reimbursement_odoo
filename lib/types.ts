export type UserRole = 'admin' | 'manager' | 'employee';

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export type ApprovalType = 'sequential' | 'parallel' | 'percentage' | 'any';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  currency: Currency;
}

export interface Company {
  id: string;
  name: string;
  country: Country;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  managerId?: string;
  department?: string;
  avatar?: string;
  createdAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  companyId: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  category: string;
  receiptUrl?: string;
  merchantName?: string;
  expenseDate: Date;
  status: ExpenseStatus;
  submittedBy: string;
  companyId: string;
  workflowId?: string;
  currentStepIndex: number;
  approvalHistory: ApprovalHistoryItem[];
  paidBy?: string;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  rejectionReason?: string;
}

export interface ApprovalHistoryItem {
  stepIndex: number;
  approverId: string;
  approverName: string;
  status: ApprovalStepStatus;
  comment?: string;
  timestamp: Date;
}

export interface ApprovalStep {
  id: string;
  order: number;
  name: string;
  type: ApprovalType;
  approvers: string[]; // User IDs
  requiredApprovals?: number; // For percentage or specific count
  percentageRequired?: number; // For percentage type
  autoApproveConditions?: AutoApproveCondition[];
}

export interface AutoApproveCondition {
  type: 'specific_approver' | 'amount_threshold' | 'category';
  approverId?: string;
  maxAmount?: number;
  categoryId?: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  steps: ApprovalStep[];
  isDefault: boolean;
  conditions?: WorkflowCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCondition {
  field: 'amount' | 'category' | 'submitter_role';
  operator: 'gt' | 'lt' | 'eq' | 'in';
  value: string | number | string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'expense_submitted' | 'expense_approved' | 'expense_rejected' | 'pending_approval' | 'workflow_updated';
  title: string;
  message: string;
  read: boolean;
  relatedExpenseId?: string;
  createdAt: Date;
}

export interface AnalyticsData {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  rejectedExpenses: number;
  totalAmount: number;
  averageApprovalTime: number;
  expensesByCategory: { category: string; amount: number; count: number }[];
  expensesByMonth: { month: string; amount: number; count: number }[];
  topSpenders: { userId: string; userName: string; amount: number }[];
}
