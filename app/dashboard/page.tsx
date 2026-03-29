'use client';

import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
  GitBranch,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user, company } = useAuth();
  const { expenses, getPendingApprovalsForUser, users, workflows } = useExpenses();

  if (!user || !company) return null;

  const userExpenses = expenses.filter((e) => e.submittedBy === user.id);
  const pendingApprovals = getPendingApprovalsForUser(user.id);

  const stats = {
    total: userExpenses.length,
    draft: userExpenses.filter((e) => e.status === 'draft').length,
    pending: userExpenses.filter((e) => e.status === 'pending').length,
    approved: userExpenses.filter((e) => e.status === 'approved').length,
    rejected: userExpenses.filter((e) => e.status === 'rejected').length,
    totalAmount: userExpenses
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0),
  };

  const recentExpenses = [...userExpenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description={`Here's what's happening with your expenses at ${company.name}`}
        action={
          <Link href="/dashboard/expenses/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {company.country.currency.symbol}
                    {stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin/Manager Stats */}
        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-amber-700">{pendingApprovals.length}</p>
                    <p className="text-sm text-amber-600">Pending Your Approval</p>
                  </div>
                  <Link href="/dashboard/approvals">
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                      Review
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {user.role === 'admin' && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
                        <Users className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{users.length}</p>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
                        <GitBranch className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{workflows.length}</p>
                        <p className="text-sm text-muted-foreground">Active Workflows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Recent Expenses and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your latest expense submissions</CardDescription>
              </div>
              <Link href="/dashboard/expenses">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No expenses yet</p>
                  <Link href="/dashboard/expenses/new">
                    <Button variant="link" size="sm">
                      Create your first expense
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/dashboard/expenses/${expense.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium">
                          {company.country.currency.symbol}
                          {(expense.convertedAmount || expense.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {getStatusBadge(expense.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/expenses/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit New Expense
                </Button>
              </Link>
              <Link href="/dashboard/expenses?status=draft" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Drafts ({stats.draft})
                </Button>
              </Link>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link href="/dashboard/approvals" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Review Approvals ({pendingApprovals.length})
                  </Button>
                </Link>
              )}
              {user.role === 'admin' && (
                <>
                  <Link href="/dashboard/users" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/dashboard/analytics" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
