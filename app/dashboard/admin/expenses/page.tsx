'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Filter, CheckCircle2, XCircle, Clock, FileText, Eye,
  ShieldAlert, Download, ArrowUpDown, Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, ExpenseStatus } from '@/lib/types';

function exportToCSV(data: Record<string, string | number>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExpensesPage() {
  const { user, company } = useAuth();
  const { expenses, users, categories, workflows, adminApproveExpense, adminRejectExpense } = useExpenses();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Override dialog state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [overrideAction, setOverrideAction] = useState<'approve' | 'reject' | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  const canViewAll = user?.role === 'admin' || user?.permissions?.canViewAllExpenses;
  const canOverride = user?.role === 'admin' || user?.permissions?.canApproveAllExpenses;

  if (!user || !company || !canViewAll) {
    return (
      <div className="min-h-screen">
        <Header title="Access Denied" />
        <div className="p-8">
          <p className="text-muted-foreground">Admin or elevated manager access required.</p>
        </div>
      </div>
    );
  }

  const companyExpenses = useMemo(() => {
    let list = expenses.filter(e => e.companyId === company.id);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(s) || e.merchantName?.toLowerCase().includes(s) ||
        users.find(u => u.id === e.submittedBy)?.name.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (employeeFilter !== 'all') list = list.filter(e => e.submittedBy === employeeFilter);
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter);
    list.sort((a, b) => {
      const aVal = sortBy === 'date' ? new Date(a.expenseDate).getTime() : (a.convertedAmount || a.amount);
      const bVal = sortBy === 'date' ? new Date(b.expenseDate).getTime() : (b.convertedAmount || b.amount);
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return list;
  }, [expenses, search, statusFilter, employeeFilter, categoryFilter, sortBy, sortOrder, users, company.id]);

  const companyUsers = users.filter(u => u.companyId === company.id);
  const employees = companyUsers.filter(u => u.role === 'employee');

  const getStatusBadge = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      draft: <Badge variant="secondary">Draft</Badge>,
      pending: <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>,
      approved: <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>,
      rejected: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const getCurrentApprover = (expense: Expense) => {
    if (expense.status !== 'pending') return '—';
    const wf = workflows.find(w => w.id === expense.workflowId);
    if (!wf) return 'Any approver';
    const step = wf.steps[expense.currentStepIndex];
    if (!step) return '—';
    return step.approvers.map(aid => users.find(u => u.id === aid)?.name || aid).join(', ');
  };

  const openOverride = (expense: Expense, action: 'approve' | 'reject') => {
    setSelectedExpense(expense);
    setOverrideAction(action);
    setOverrideReason('');
  };

  const handleOverride = () => {
    if (!selectedExpense || !overrideReason.trim()) return;
    if (overrideAction === 'approve') {
      adminApproveExpense(selectedExpense.id, overrideReason);
    } else {
      adminRejectExpense(selectedExpense.id, overrideReason);
    }
    setSelectedExpense(null);
    setOverrideAction(null);
    setOverrideReason('');
  };

  const handleExport = () => {
    const rows = companyExpenses.map(e => ({
      Title: e.title,
      Employee: users.find(u => u.id === e.submittedBy)?.name || e.submittedBy,
      Category: categories.find(c => c.id === e.category)?.name || e.category,
      Amount: e.amount,
      Currency: e.currency,
      ConvertedAmount: (e.convertedAmount || e.amount).toFixed(2),
      CompanyCurrency: company.country.currency.code,
      Status: e.status,
      Date: format(new Date(e.expenseDate), 'yyyy-MM-dd'),
      CurrentApprover: getCurrentApprover(e),
      SubmittedOn: format(new Date(e.createdAt), 'yyyy-MM-dd'),
    }));
    exportToCSV(rows, `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  // Summary counts
  const counts = { total: companyExpenses.length, pending: companyExpenses.filter(e => e.status === 'pending').length, approved: companyExpenses.filter(e => e.status === 'approved').length, rejected: companyExpenses.filter(e => e.status === 'rejected').length };

  return (
    <div className="min-h-screen">
      <Header
        title="Expense Monitor"
        description="View and manage all company expenses with admin override"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: counts.total, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Pending', value: counts.pending, color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200' },
            { label: 'Approved', value: counts.approved, color: 'text-green-700', bg: 'bg-green-50 border border-green-200' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-700', bg: 'bg-red-50 border border-red-200' },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={bg}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by title, merchant, employee…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ExpenseStatus | 'all')}>
                <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {companyUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Employee / Expense</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => toggleSort('amount')}>
                    Amount <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => toggleSort('date')}>
                    Date <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Approver</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No expenses match your filters.
                  </TableCell>
                </TableRow>
              ) : companyExpenses.map(expense => {
                const submitter = users.find(u => u.id === expense.submittedBy);
                const cat = categories.find(c => c.id === expense.category);
                const isOverrideable = expense.status === 'pending' || expense.status === 'draft';
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                          {submitter?.avatar || submitter?.name.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">{submitter?.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{cat?.name || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{company.country.currency.symbol}{(expense.convertedAmount || expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {expense.currency !== company.country.currency.code && (
                        <p className="text-xs text-muted-foreground">{expense.currency} {expense.amount.toFixed(2)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[140px] block">{getCurrentApprover(expense)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewExpense(expense)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canOverride && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openOverride(expense, 'approve')}
                              title="Admin Override: Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openOverride(expense, 'reject')}
                              title="Admin Override: Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Override Dialog */}
      <Dialog open={!!selectedExpense && !!overrideAction} onOpenChange={() => { setSelectedExpense(null); setOverrideAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${overrideAction === 'approve' ? 'text-green-600' : 'text-red-600'}`} />
              Admin Override — {overrideAction === 'approve' ? 'Force Approve' : 'Force Reject'}
            </DialogTitle>
            <DialogDescription>
              {selectedExpense && <>
                You are about to <strong>{overrideAction === 'approve' ? 'force-approve' : 'force-reject'}</strong>{' '}
                &quot;{selectedExpense.title}&quot; for {company.country.currency.symbol}{(selectedExpense.convertedAmount || selectedExpense.amount).toFixed(2)}.
                This action will be recorded in the audit log.
              </>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">A mandatory reason is required for all admin override actions.</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Select onValueChange={v => setOverrideReason(v)}>
                <SelectTrigger className="mb-2">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {overrideAction === 'approve' ? <>
                    <SelectItem value="Business critical client meeting expense">Business critical client meeting expense</SelectItem>
                    <SelectItem value="Pre-approved by senior leadership">Pre-approved by senior leadership</SelectItem>
                    <SelectItem value="Approval chain unavailable — director approved verbally">Approval chain unavailable — director approved verbally</SelectItem>
                    <SelectItem value="Custom reason">Custom reason…</SelectItem>
                  </> : <>
                    <SelectItem value="Duplicate expense submission">Duplicate expense submission</SelectItem>
                    <SelectItem value="Policy violation — exceeds approved limit">Policy violation — exceeds approved limit</SelectItem>
                    <SelectItem value="Missing required receipts">Missing required receipts</SelectItem>
                    <SelectItem value="Invalid category">Invalid category</SelectItem>
                    <SelectItem value="Custom reason">Custom reason…</SelectItem>
                  </>}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Enter or elaborate on your reason…"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedExpense(null); setOverrideAction(null); }}>Cancel</Button>
            <Button
              onClick={handleOverride}
              disabled={!overrideReason.trim()}
              className={overrideAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {overrideAction === 'approve' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Confirm {overrideAction === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewExpense} onOpenChange={() => setViewExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>{viewExpense?.title}</DialogDescription>
          </DialogHeader>
          {viewExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Employee</p><p className="font-medium">{users.find(u => u.id === viewExpense.submittedBy)?.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">{company.country.currency.symbol}{(viewExpense.convertedAmount || viewExpense.amount).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{categories.find(c => c.id === viewExpense.category)?.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{format(new Date(viewExpense.expenseDate), 'MMM d, yyyy')}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{getStatusBadge(viewExpense.status)}</div>
                <div><p className="text-xs text-muted-foreground">Merchant</p><p className="font-medium">{viewExpense.merchantName || '—'}</p></div>
              </div>
              {viewExpense.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewExpense.description}</p></div>}
              {/* Approval timeline */}
              {viewExpense.approvalHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Approval Timeline</p>
                  <div className="space-y-2">
                    {viewExpense.approvalHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${h.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{h.approverName} — <span className={h.status === 'approved' ? 'text-green-600' : 'text-red-600'}>{h.status}</span></p>
                          {h.comment && <p className="text-xs text-muted-foreground mt-0.5">{h.comment}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(h.timestamp), 'MMM d, yyyy HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewExpense.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                  <p className="text-sm text-red-600">{viewExpense.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewExpense(null)}>Close</Button>
            {viewExpense && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { openOverride(viewExpense, 'approve'); setViewExpense(null); }}
              >
                <ShieldAlert className="w-4 h-4 mr-2" />Admin Override
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
