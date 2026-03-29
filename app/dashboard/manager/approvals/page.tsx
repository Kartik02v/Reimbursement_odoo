'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  CheckCheck,
  FileText,
  MoreHorizontal,
  Filter,
  Users as UsersIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [teamFilter, setTeamFilter] = useState<string>('all');

  if (!user || !company) return null;

  const pendingApprovalsAll = getPendingApprovalsForUser(user.id);
  
  // Get unique departments (teams) from pending approvals
  const teamOptions = Array.from(new Set(
    pendingApprovalsAll.map(e => users.find(u => u.id === e.submittedBy)?.department).filter(Boolean)
  )) as string[];

  const pendingApprovals = teamFilter === 'all' 
    ? pendingApprovalsAll 
    : pendingApprovalsAll.filter(e => users.find(u => u.id === e.submittedBy)?.department === teamFilter);

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

  const getSubmitter = (submitterId: string) => {
    return users.find((u) => u.id === submitterId);
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

  const getStatusBadge = (expense: Expense) => {
    const userAction = expense.approvalHistory.find((h) => h.approverId === user.id);
    
    if (userAction) {
      if (userAction.status === 'approved') {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      }
      return <Badge variant="destructive">Rejected</Badge>;
    }
    
    switch (expense.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{expense.status}</Badge>;
    }
  };

  const ApprovalTable = ({ expenses, showActions = true }: { expenses: Expense[]; showActions?: boolean }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px]">Submitter</TableHead>
            <TableHead className="w-[250px]">Expense Details</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[120px] text-right">Amount</TableHead>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[150px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const submitter = getSubmitter(expense.submittedBy);
            const userAction = expense.approvalHistory.find((h) => h.approverId === user.id);

            return (
              <TableRow key={expense.id} className="hover:bg-muted/30">
                {/* Submitter */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                      {submitter?.avatar || submitter?.name.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{submitter?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{submitter?.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Expense Details */}
                <TableCell>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{expense.title}</p>
                    {expense.merchantName && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {expense.merchantName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(expense.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {getCategoryName(expense.category)}
                  </Badge>
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right">
                  <div>
                    <p className="font-semibold">
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
                </TableCell>

                {/* Date */}
                <TableCell>
                  <p className="text-sm">{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</p>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {getStatusBadge(expense)}
                      </TooltipTrigger>
                      {userAction && (
                        <TooltipContent>
                          <p>
                            {userAction.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                            {format(new Date(userAction.timestamp), 'MMM d, yyyy')}
                          </p>
                          {userAction.comment && <p className="text-xs">{userAction.comment}</p>}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {showActions ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/dashboard/expenses/${expense.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/expenses/${expense.id}`} className="flex items-center">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled>
                            <FileText className="mr-2 h-4 w-4" />
                            Download Receipt
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review
                {pendingApprovalsAll.length > 0 && (
                  <Badge className="ml-2 bg-amber-100 text-amber-700">{pendingApprovalsAll.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">Recently Processed</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by Team:</span>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[180px]">
                  <UsersIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teamOptions.map(team => (
                    <SelectItem key={team} value={team}>{team} Team</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="pending">
            {pendingApprovals.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>All caught up!</EmptyTitle>
                  <EmptyDescription>No expenses pending your approval</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ApprovalTable expenses={pendingApprovals} showActions />
            )}
          </TabsContent>

          <TabsContent value="history">
            {recentlyProcessed.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon"><Clock /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No recent activity</EmptyTitle>
                  <EmptyDescription>Your approval history will appear here</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ApprovalTable expenses={recentlyProcessed} showActions={false} />
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