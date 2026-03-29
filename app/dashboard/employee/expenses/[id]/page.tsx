'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Edit,
  Send,
  Trash2,
  RotateCcw,
  Receipt,
  Calendar,
  Building2,
  Tag,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, company } = useAuth();
  const { expenses, categories, users, workflows, submitExpense, deleteExpense, resubmitExpense } = useExpenses();

  const expense = expenses.find((e) => e.id === id);

  if (!user || !company) return null;

  if (!expense) {
    return (
      <div className="min-h-screen">
        <Header title="Expense Not Found" />
        <div className="p-8">
          <p className="text-muted-foreground">This expense does not exist or has been deleted.</p>
          <Link href="/dashboard/employee/expenses">
            <Button className="mt-4">Back to Expenses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === expense.category);
  const submitter = users.find((u) => u.id === expense.submittedBy);
  const workflow = workflows.find((w) => w.id === expense.workflowId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="text-base px-3 py-1">Draft</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-base px-3 py-1">Pending Approval</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-base px-3 py-1">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-base px-3 py-1">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Expense Details"
        action={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-8 max-w-4xl">
        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusBadge(expense.status)}
                </div>
                <h2 className="text-2xl font-bold">{expense.title}</h2>
                {expense.merchantName && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    {expense.merchantName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {company.country.currency.symbol}
                  {(expense.convertedAmount || expense.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {expense.currency !== company.country.currency.code && (
                  <p className="text-sm text-muted-foreground">
                    Original: {expense.currency} {expense.amount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
              {expense.status === 'draft' && (
                <>
                  <Link href={`/dashboard/employee/expenses/${expense.id}/edit`}>
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button onClick={() => submitExpense(expense.id)}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Approval
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteExpense(expense.id);
                      router.push('/dashboard/employee/expenses');
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              {expense.status === 'rejected' && (
                <Button onClick={() => resubmitExpense(expense.id)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resubmit Expense
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Date
                </span>
                <span className="font-medium">{format(new Date(expense.expenseDate), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  Category
                </span>
                <span className="font-medium">{category?.name || 'Other'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  Submitted By
                </span>
                <span className="font-medium">{submitter?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Created
                </span>
                <span className="font-medium">{format(new Date(expense.createdAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {expense.description && (
                <div className="pt-2">
                  <span className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </span>
                  <p className="text-sm">{expense.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expense.receiptUrl ? (
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full h-64 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-full h-64 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No receipt attached</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approval Timeline */}
        {expense.status !== 'draft' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Approval Timeline</CardTitle>
              <CardDescription>
                {workflow ? `Workflow: ${workflow.name}` : 'Standard approval workflow'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-border" />

                <div className="space-y-6">
                  {/* Submitted step */}
                  <div className="flex gap-4">
                    <div className="relative z-10">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Send className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium">Expense Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        by {submitter?.name} on {format(new Date(expense.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  {/* Workflow steps */}
                  {workflow?.steps.map((step, index) => {
                    const historyItem = expense.approvalHistory.find((h) => h.stepIndex === index);
                    const isPending = expense.currentStepIndex === index && expense.status === 'pending';
                    const isFuture = index > expense.currentStepIndex && expense.status === 'pending';
                    const approverNames = step.approvers
                      .map((id) => users.find((u) => u.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <div key={step.id} className="flex gap-4">
                        <div className="relative z-10">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              historyItem?.status === 'approved'
                                ? 'bg-green-100'
                                : historyItem?.status === 'rejected'
                                ? 'bg-destructive/10'
                                : isPending
                                ? 'bg-amber-100'
                                : 'bg-muted'
                            }`}
                          >
                            {getStepIcon(historyItem?.status || (isPending ? 'pending' : 'future'))}
                          </div>
                        </div>
                        <div className="flex-1 pb-2">
                          <p className={`font-medium ${isFuture ? 'text-muted-foreground' : ''}`}>
                            {step.name}
                          </p>
                          {historyItem ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {historyItem.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                                {historyItem.approverName} on{' '}
                                {format(new Date(historyItem.timestamp), 'MMM d, yyyy h:mm a')}
                              </p>
                              {historyItem.comment && (
                                <div className="mt-2 flex items-start gap-2 p-3 bg-muted rounded-lg">
                                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <p className="text-sm">{historyItem.comment}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {isPending ? 'Waiting for approval from ' : 'Pending: '}
                              {approverNames}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Final status */}
                  {expense.status === 'approved' && (
                    <div className="flex gap-4">
                      <div className="relative z-10">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-green-600">Fully Approved</p>
                        <p className="text-sm text-muted-foreground">Ready for reimbursement</p>
                      </div>
                    </div>
                  )}

                  {expense.status === 'rejected' && expense.rejectionReason && (
                    <div className="flex gap-4">
                      <div className="relative z-10">
                        <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-destructive">Rejected</p>
                        <div className="mt-2 p-3 bg-destructive/10 rounded-lg">
                          <p className="text-sm">{expense.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
