'use client';

import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download, Users, FileText, Shield, BarChart3, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

function exportToCSV(data: Record<string, string | number>[], filename: string) {
  if (!data.length) {
    alert('No data to export.');
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user, company } = useAuth();
  const { expenses, users, categories, auditLog } = useExpenses();

  if (!user || !company || user.role !== 'admin') {
    return (
      <div className="min-h-screen"><Header title="Access Denied" />
        <div className="p-8"><p className="text-muted-foreground">Admin access required.</p></div>
      </div>
    );
  }

  const companyExpenses = expenses.filter(e => e.companyId === company.id);
  const companyUsers = users.filter(u => u.companyId === company.id);
  const companyAudit = auditLog.filter(l => l.companyId === company.id);

  // Stats for preview
  const totalExpenseAmount = companyExpenses
    .filter(e => e.status === 'approved')
    .reduce((s, e) => s + (e.convertedAmount || e.amount), 0);

  const exportExpenses = () => {
    const rows = companyExpenses.map(e => ({
      ID: e.id,
      Title: e.title,
      Employee: users.find(u => u.id === e.submittedBy)?.name || e.submittedBy,
      EmployeeEmail: users.find(u => u.id === e.submittedBy)?.email || '',
      Category: categories.find(c => c.id === e.category)?.name || e.category,
      OriginalAmount: e.amount,
      OriginalCurrency: e.currency,
      ConvertedAmount: (e.convertedAmount || e.amount).toFixed(2),
      CompanyCurrency: company.country.currency.code,
      Status: e.status,
      ExpenseDate: format(new Date(e.expenseDate), 'yyyy-MM-dd'),
      SubmittedOn: format(new Date(e.createdAt), 'yyyy-MM-dd'),
      MerchantName: e.merchantName || '',
      Approvers: e.approvalHistory.map(h => `${h.approverName}(${h.status})`).join(' → '),
      RejectionReason: e.rejectionReason || '',
    }));
    exportToCSV(rows, `expenses-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportAuditLogs = () => {
    const rows = companyAudit.map(l => ({
      Timestamp: format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      User: l.userName,
      UserId: l.userId,
      Action: l.actionType,
      EntityType: l.entityType,
      EntityName: l.entityName,
      EntityId: l.entityId,
      Comment: l.comment || '',
      OverrideType: l.overrideType || '',
      OldValue: l.oldValue || '',
      NewValue: l.newValue || '',
    }));
    exportToCSV(rows, `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportUsers = () => {
    const rows = companyUsers.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      ReportsTo: users.find(m => m.id === u.managerId)?.name || '',
      JoinedOn: format(new Date(u.createdAt), 'yyyy-MM-dd'),
    }));
    exportToCSV(rows, `users-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportApprovedExpenses = () => {
    const rows = companyExpenses.filter(e => e.status === 'approved').map(e => ({
      ID: e.id,
      Title: e.title,
      Employee: users.find(u => u.id === e.submittedBy)?.name || e.submittedBy,
      Category: categories.find(c => c.id === e.category)?.name || e.category,
      Amount: (e.convertedAmount || e.amount).toFixed(2),
      Currency: company.country.currency.code,
      ExpenseDate: format(new Date(e.expenseDate), 'yyyy-MM-dd'),
      ApprovedBy: e.approvalHistory.filter(h => h.status === 'approved').map(h => h.approverName).join(', '),
    }));
    exportToCSV(rows, `approved-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  function ExportCard({ title, description, icon: Icon, count, label, color, onExport }: {
    title: string; description: string; icon: React.ElementType; count: number | string; label: string;
    color: string; onExport: () => void;
  }) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 justify-between gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          <Button onClick={onExport} className="w-full">
            <Download className="w-4 h-4 mr-2" />Download CSV
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Reports & Export" description="Download company data as CSV for accounting, compliance, and HR" />
      <div className="p-8 space-y-8">

        {/* Summary banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-800">{companyExpenses.length}</p>
                  <p className="text-sm text-blue-600">Total Expenses in System</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-800">
                    {company.country.currency.symbol}{totalExpenseAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-green-600">Total Approved Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-800">{companyAudit.length}</p>
                  <p className="text-sm text-purple-600">Total Audit Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Exports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ExportCard
              title="All Expenses"
              description="Complete expense list with employee, category, amount, status, and approval chain"
              icon={FileText}
              count={companyExpenses.length}
              label="Total records"
              color="bg-indigo-100 text-indigo-600"
              onExport={exportExpenses}
            />
            <ExportCard
              title="Approved Expenses"
              description="Only approved expenses — suitable for accounting and finance reconciliation"
              icon={CheckCircle2}
              count={companyExpenses.filter(e => e.status === 'approved').length}
              label="Approved records"
              color="bg-green-100 text-green-600"
              onExport={exportApprovedExpenses}
            />
            <ExportCard
              title="Audit Logs"
              description="Full system audit trail including overrides, approvals, and user changes"
              icon={Shield}
              count={companyAudit.length}
              label="Audit events"
              color="bg-purple-100 text-purple-600"
              onExport={exportAuditLogs}
            />
            <ExportCard
              title="Users"
              description="All team members with roles, hierarchy, and join dates"
              icon={Users}
              count={companyUsers.length}
              label="Users"
              color="bg-blue-100 text-blue-600"
              onExport={exportUsers}
            />
          </div>
        </div>

        {/* Info card */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">Export Notes</p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1 list-disc list-inside">
                  <li>All exports generate real CSV files and download immediately.</li>
                  <li>Amounts are converted to the company base currency ({company.country.currency.code}).</li>
                  <li>Audit log exports are suitable for compliance audits and fraud investigation.</li>
                  <li>Data is limited to your company ({company.name}) only.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
