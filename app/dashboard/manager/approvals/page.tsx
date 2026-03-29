'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Empty } from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Receipt,
  User,
  Calendar,
  Building2,
  Tag,
  MessageSquare,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Expense } from '@/lib/types';

export default function ApprovalsPage() {
  const { user, company } = useAuth();
  const { getPendingApprovalsForUser, categories, users, approveExpense, rejectExpense, expenses } = useExpenses();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!user || !company) return null;

  const pendingApprovals = getPendingApprovalsForUser(user.id);
  
  // Get recently processed expenses (approved/rejected in last 7 days)
  const recentlyProcessed = expenses
    .filter((e) => {
      const lastAction = e.approvalHistory.find((h) => h.approverId === user.id);
      if (!lastAction) return false;
      const daysSince = (Date.now() - new Date(lastAction.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    })
    .sort((a, b) => {
      const aTime = a.approvalHistory.find((h) => h.approverId === user.id)?.timestamp;
      const bTime = b.approvalHistory.find((h) => h.approverId === user.id)?.timestamp;
      return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
    });

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Other';
  };

  const getSubmitterName = (submitterId: string) => {
    return users.find((u) => u.id === submitterId)?.name || 'Unknown';
  };

  const handleApprove = () => {
    if (selectedExpense) {
      approveExpense(selectedExpense.id, comment || undefined);
      setShowApproveDialog(false);
      setSelectedExpense(null);
      setComment('');
    }
  };

  const handleReject = () => {
    if (selectedExpense && rejectReason) {
      rejectExpense(selectedExpense.id, rejectReason);
      setShowRejectDialog(false);
      setSelectedExpense(null);
      setRejectReason('');
    }
  };

  const ExpenseCard = ({ expense, showActions = true }: { expense: Expense; showActions?: boolean }) => {
    const submitter = users.find((u) => u.id === expense.submittedBy);
    const userAction = expense.approvalHistory.find((h) => h.approverId === user.id);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-medium">
                {submitter?.avatar || submitter?.name.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-medium">{submitter?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDistanceToNow(new Date(expense.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                {company.country.currency.symbol}
                {(expense.convertedAmount || expense.amount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {expense.currency !== company.country.currency.code && (
                <p className="text-xs text-muted-foreground">
                  {expense.currency} {expense.amount.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{expense.title}</h3>
              {expense.merchantName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {expense.merchantName}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Tag className="w-3 h-3 mr-1" />
                {getCategoryName(expense.category)}
              </Badge>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
              </Badge>
            </div>

            {expense.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{expense.description}</p>
            )}

            {/* Previous approvals */}
            {expense.approvalHistory.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Previous Approvals</p>
                {expense.approvalHistory.map((history, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {history.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span>
                      {history.approverName} {history.status} on{' '}
                      {format(new Date(history.timestamp), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {userAction && (
              <div className="pt-3 border-t">
                <div className={`flex items-center gap-2 text-sm ${
                  userAction.status === 'approved' ? 'text-green-600' : 'text-destructive'
                }`}>
                  {userAction.status === 'approved' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    You {userAction.status} this on {format(new Date(userAction.timestamp), 'MMM d, yyyy')}
                  </span>
                </div>
                {userAction.comment && (
                  <p className="text-sm text-muted-foreground mt-1 pl-6">
                    {userAction.comment}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Link href={`/dashboard/employee/expenses/${expense.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </Link>
            {showActions && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedExpense(expense);
                    setShowRejectDialog(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setSelectedExpense(expense);
                    setShowApproveDialog(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Approvals"
        description="Review and process expense approval requests"
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                  <CheckCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {recentlyProcessed.filter((e) => 
                      e.approvalHistory.find((h) => h.approverId === user.id)?.status === 'approved'
                    ).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Approved (7 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {recentlyProcessed.filter((e) =>
                      e.approvalHistory.find((h) => h.approverId === user.id)?.status === 'rejected'
                    ).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Rejected (7 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Review
              {pendingApprovals.length > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-700">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Recently Processed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApprovals.length === 0 ? (
              <Empty
                icon={CheckCircle2}
                title="All caught up!"
                description="No expenses pending your approval"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingApprovals.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {recentlyProcessed.length === 0 ? (
              <Empty
                icon={Clock}
                title="No recent activity"
                description="Your approval history will appear here"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recentlyProcessed.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Approve Expense
            </DialogTitle>
            <DialogDescription>
              {selectedExpense && (
                <>
                  Approve &quot;{selectedExpense.title}&quot; for{' '}
                  {company.country.currency.symbol}
                  {(selectedExpense.convertedAmount || selectedExpense.amount).toFixed(2)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Add a comment for the submitter..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Reject Expense
            </DialogTitle>
            <DialogDescription>
              {selectedExpense && (
                <>
                  Reject &quot;{selectedExpense.title}&quot; for{' '}
                  {company.country.currency.symbol}
                  {(selectedExpense.convertedAmount || selectedExpense.amount).toFixed(2)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">
                The submitter will be notified of this rejection and can resubmit with corrections.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                placeholder="Please provide a reason for rejecting this expense..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
