import "dotenv/config";
import { PrismaClient, UserRole, ExpenseStatus, ApprovalStepStatus, ApprovalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Company
  const company = await prisma.company.upsert({
    where: { id: 'company-1' },
    update: {},
    create: {
      id: 'company-1',
      name: 'Acme Corporation',
      country: {
        code: 'US',
        name: 'United States',
        currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
      },
      createdAt: new Date('2024-01-01'),
    },
  });

  // 2. Users (Ordered by manager dependency)
  const usersData = [
    {
      id: 'user-1',
      email: 'admin@acme.com',
      name: 'Sarah Johnson',
      role: UserRole.admin,
      companyId: 'company-1',
      department: 'Operations',
      avatar: 'SJ',
    },
    {
      id: 'user-2',
      email: 'manager@acme.com',
      name: 'Michael Chen',
      role: UserRole.manager,
      companyId: 'company-1',
      managerId: 'user-1',
      department: 'Engineering',
      avatar: 'MC',
    },
    {
      id: 'user-3',
      email: 'manager2@acme.com',
      name: 'Emily Davis',
      role: UserRole.manager,
      companyId: 'company-1',
      managerId: 'user-1',
      department: 'Sales',
      avatar: 'ED',
    },
    {
      id: 'user-4',
      email: 'employee@acme.com',
      name: 'James Wilson',
      role: UserRole.employee,
      companyId: 'company-1',
      managerId: 'user-2',
      department: 'Engineering',
      avatar: 'JW',
    },
    {
      id: 'user-5',
      email: 'employee2@acme.com',
      name: 'Lisa Anderson',
      role: UserRole.employee,
      companyId: 'company-1',
      managerId: 'user-2',
      department: 'Engineering',
      avatar: 'LA',
    },
    {
      id: 'user-6',
      email: 'employee3@acme.com',
      name: 'Robert Brown',
      role: UserRole.employee,
      companyId: 'company-1',
      managerId: 'user-3',
      department: 'Sales',
      avatar: 'RB',
    },
  ];

  for (const userData of usersData) {
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: userData,
    });
  }

  // 3. Categories
  const categoriesData = [
    { id: 'cat-1', name: 'Travel', icon: 'plane', companyId: 'company-1' },
    { id: 'cat-2', name: 'Meals & Entertainment', icon: 'utensils', companyId: 'company-1' },
    { id: 'cat-3', name: 'Office Supplies', icon: 'paperclip', companyId: 'company-1' },
    { id: 'cat-4', name: 'Software & Tools', icon: 'laptop', companyId: 'company-1' },
    { id: 'cat-5', name: 'Transportation', icon: 'car', companyId: 'company-1' },
    { id: 'cat-6', name: 'Accommodation', icon: 'building', companyId: 'company-1' },
    { id: 'cat-7', name: 'Training & Education', icon: 'graduation-cap', companyId: 'company-1' },
    { id: 'cat-8', name: 'Other', icon: 'receipt', companyId: 'company-1' },
  ];

  for (const cat of categoriesData) {
    await prisma.expenseCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  // 4. Workflows & Steps
  const workflowsData = [
    {
      id: 'workflow-1',
      name: 'Standard Approval',
      description: 'Default workflow for expenses under $1000',
      companyId: 'company-1',
      isDefault: true,
      conditions: [{ field: 'amount', operator: 'lt', value: 1000 }],
      steps: {
        create: [
          {
            id: 'step-1',
            order: 1,
            name: 'Manager Approval',
            type: ApprovalType.sequential,
            approvers: ['user-2', 'user-3'],
          },
        ],
      },
    },
    {
      id: 'workflow-2',
      name: 'High Value Approval',
      description: 'Multi-level approval for expenses $1000 and above',
      companyId: 'company-1',
      isDefault: false,
      conditions: [{ field: 'amount', operator: 'gt', value: 999 }],
      steps: {
        create: [
          {
            id: 'step-2',
            order: 1,
            name: 'Manager Approval',
            type: ApprovalType.sequential,
            approvers: ['user-2', 'user-3'],
          },
          {
            id: 'step-3',
            order: 2,
            name: 'Finance Review',
            type: ApprovalType.sequential,
            approvers: ['user-1'],
            autoApproveConditions: [{ type: 'specific_approver', approverId: 'user-1' }],
          },
        ],
      },
    },
    {
      id: 'workflow-3',
      name: 'Travel Expenses',
      description: 'Specific workflow for travel-related expenses',
      companyId: 'company-1',
      isDefault: false,
      conditions: [{ field: 'category', operator: 'eq', value: 'cat-1' }],
      steps: {
        create: [
          {
            id: 'step-4',
            order: 1,
            name: 'Manager Approval',
            type: ApprovalType.sequential,
            approvers: ['user-2', 'user-3'],
          },
          {
            id: 'step-5',
            order: 2,
            name: 'Travel Desk Review',
            type: ApprovalType.parallel,
            approvers: ['user-1', 'user-3'],
            requiredApprovals: 1,
          },
        ],
      },
    },
  ];

  for (const wf of workflowsData) {
    const { steps, ...wfData } = wf;
    await prisma.approvalWorkflow.upsert({
      where: { id: wf.id },
      update: {},
      create: {
        ...wfData,
        steps: steps,
      },
    });
  }

  // 5. Expenses & History
  const expensesData = [
    {
      id: 'exp-1',
      title: 'Client Dinner - Q1 Review',
      description: 'Dinner with key client stakeholders to discuss Q1 results',
      amount: 245.50,
      currency: 'USD',
      convertedAmount: 245.50,
      category: 'cat-2',
      receiptUrl: '/receipts/receipt-1.jpg',
      merchantName: 'The Capital Grille',
      expenseDate: new Date('2024-03-15'),
      status: ExpenseStatus.approved,
      submittedBy: 'user-4',
      companyId: 'company-1',
      workflowId: 'workflow-1',
      currentStepIndex: 1,
      approvalHistory: {
        create: [
          {
            stepIndex: 0,
            approverId: 'user-2',
            approverName: 'Michael Chen',
            status: ApprovalStepStatus.approved,
            comment: 'Approved. Good client relationship investment.',
            timestamp: new Date('2024-03-16'),
          },
        ],
      },
    },
    {
      id: 'exp-2',
      title: 'Flight to NYC - Conference',
      description: 'Round trip flight for industry conference',
      amount: 1250.00,
      currency: 'USD',
      convertedAmount: 1250.00,
      category: 'cat-1',
      receiptUrl: '/receipts/receipt-2.jpg',
      merchantName: 'United Airlines',
      expenseDate: new Date('2024-03-20'),
      status: ExpenseStatus.pending,
      submittedBy: 'user-4',
      companyId: 'company-1',
      workflowId: 'workflow-2',
      currentStepIndex: 1,
      approvalHistory: {
        create: [
          {
            stepIndex: 0,
            approverId: 'user-2',
            approverName: 'Michael Chen',
            status: ApprovalStepStatus.approved,
            comment: 'Conference attendance approved.',
            timestamp: new Date('2024-03-21'),
          },
        ],
      },
    },
    {
      id: 'exp-3',
      title: 'Office Supplies - March',
      description: 'Monthly office supplies purchase',
      amount: 89.99,
      currency: 'USD',
      convertedAmount: 89.99,
      category: 'cat-3',
      receiptUrl: '/receipts/receipt-3.jpg',
      merchantName: 'Staples',
      expenseDate: new Date('2024-03-18'),
      status: ExpenseStatus.pending,
      submittedBy: 'user-5',
      companyId: 'company-1',
      workflowId: 'workflow-1',
      currentStepIndex: 0,
    },
    {
      id: 'exp-4',
      title: 'Software License - Figma',
      description: 'Annual Figma license renewal',
      amount: 540.00,
      currency: 'USD',
      convertedAmount: 540.00,
      category: 'cat-4',
      receiptUrl: '/receipts/receipt-4.jpg',
      merchantName: 'Figma Inc.',
      expenseDate: new Date('2024-03-10'),
      status: ExpenseStatus.rejected,
      submittedBy: 'user-6',
      companyId: 'company-1',
      workflowId: 'workflow-1',
      currentStepIndex: 0,
      rejectionReason: 'Please use company-provided design tools. Reach out to IT for access.',
      approvalHistory: {
        create: [
          {
            stepIndex: 0,
            approverId: 'user-3',
            approverName: 'Emily Davis',
            status: ApprovalStepStatus.rejected,
            comment: 'Please use company-provided design tools. Reach out to IT for access.',
            timestamp: new Date('2024-03-11'),
          },
        ],
      },
    },
    {
      id: 'exp-5',
      title: 'Taxi - Airport Transfer',
      description: 'Taxi from JFK to Manhattan office',
      amount: 75.00,
      currency: 'USD',
      convertedAmount: 75.00,
      category: 'cat-5',
      receiptUrl: '/receipts/receipt-5.jpg',
      merchantName: 'NYC Taxi',
      expenseDate: new Date('2024-03-22'),
      status: ExpenseStatus.draft,
      submittedBy: 'user-4',
      companyId: 'company-1',
      currentStepIndex: 0,
    },
    {
      id: 'exp-6',
      title: 'Hotel - NYC Conference',
      description: '3 nights at conference hotel',
      amount: 890.00,
      currency: 'USD',
      convertedAmount: 890.00,
      category: 'cat-6',
      receiptUrl: '/receipts/receipt-6.jpg',
      merchantName: 'Marriott Times Square',
      expenseDate: new Date('2024-03-20'),
      status: ExpenseStatus.pending,
      submittedBy: 'user-5',
      companyId: 'company-1',
      workflowId: 'workflow-1',
      currentStepIndex: 0,
    },
    {
      id: 'exp-7',
      title: 'Team Lunch',
      description: 'Monthly team building lunch',
      amount: 320.00,
      currency: 'USD',
      convertedAmount: 320.00,
      category: 'cat-2',
      merchantName: 'Local Restaurant',
      expenseDate: new Date('2024-03-25'),
      status: ExpenseStatus.pending,
      submittedBy: 'user-6',
      companyId: 'company-1',
      workflowId: 'workflow-1',
      currentStepIndex: 0,
    },
  ];

  for (const exp of expensesData) {
    const { approvalHistory, ...expData } = exp;
    await prisma.expense.upsert({
      where: { id: exp.id },
      update: {},
      create: {
        ...expData,
        approvalHistory: approvalHistory,
      },
    });
  }

  // 6. Notifications
  const notificationsData = [
    {
      id: 'notif-1',
      userId: 'user-2',
      type: 'pending_approval',
      title: 'New Expense Pending',
      message: 'James Wilson submitted "Office Supplies - March" for approval.',
      read: false,
      relatedExpenseId: 'exp-3',
      createdAt: new Date('2024-03-18'),
    },
    {
      id: 'notif-2',
      userId: 'user-2',
      type: 'pending_approval',
      title: 'New Expense Pending',
      message: 'Lisa Anderson submitted "Hotel - NYC Conference" for approval.',
      read: false,
      relatedExpenseId: 'exp-6',
      createdAt: new Date('2024-03-20'),
    },
    {
      id: 'notif-3',
      userId: 'user-4',
      type: 'expense_approved',
      title: 'Expense Approved',
      message: 'Your expense "Client Dinner - Q1 Review" has been approved.',
      read: true,
      relatedExpenseId: 'exp-1',
      createdAt: new Date('2024-03-16'),
    },
    {
      id: 'notif-4',
      userId: 'user-6',
      type: 'expense_rejected',
      title: 'Expense Rejected',
      message: 'Your expense "Software License - Figma" has been rejected.',
      read: false,
      relatedExpenseId: 'exp-4',
      createdAt: new Date('2024-03-11'),
    },
    {
      id: 'notif-5',
      userId: 'user-1',
      type: 'pending_approval',
      title: 'Finance Review Required',
      message: 'High value expense "Flight to NYC - Conference" requires finance approval.',
      read: false,
      relatedExpenseId: 'exp-2',
      createdAt: new Date('2024-03-21'),
    },
  ];

  for (const notif of notificationsData) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {},
      create: notif,
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
