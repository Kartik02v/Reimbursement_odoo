'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, FileText, Clock, CheckCircle2, XCircle, DollarSign, TrendingUp,
  AlertTriangle, ArrowRight, Plus, GitBranch, Shield, Activity,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444', draft: '#6b7280' };
const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminDashboardPage() {
  const { user, company } = useAuth();
  const { expenses, users, workflows, categories, getPendingApprovalsForUser, auditLog } = useExpenses();

  if (!user || !company || user.role !== 'admin') return null;

  const companyExpenses = expenses.filter(e => e.companyId === company.id);
  const companyUsers = users.filter(u => u.companyId === company.id);
  const pendingApprovals = getPendingApprovalsForUser(user.id);

  // KPI stats
  const stats = useMemo(() => ({
    totalEmployees: companyUsers.filter(u => u.role === 'employee').length,
    totalExpenses: companyExpenses.length,
    pendingApprovals: companyExpenses.filter(e => e.status === 'pending').length,
    approved: companyExpenses.filter(e => e.status === 'approved').length,
    rejected: companyExpenses.filter(e => e.status === 'rejected').length,
    totalApprovedAmount: companyExpenses
      .filter(e => e.status === 'approved')
      .reduce((s, e) => s + (e.convertedAmount || e.amount), 0),
  }), [companyExpenses, companyUsers]);

  // Monthly trend (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const monthExps = companyExpenses.filter(e =>
        isWithinInterval(new Date(e.createdAt), { start: startOfMonth(d), end: endOfMonth(d) })
      );
      return {
        month: format(d, 'MMM'),
        total: monthExps.reduce((s, e) => s + (e.convertedAmount || e.amount), 0),
        approved: monthExps.filter(e => e.status === 'approved').length,
        pending: monthExps.filter(e => e.status === 'pending').length,
      };
    });
  }, [companyExpenses]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Approved', value: stats.approved, color: STATUS_COLORS.approved },
    { name: 'Pending', value: stats.pendingApprovals, color: STATUS_COLORS.pending },
    { name: 'Rejected', value: stats.rejected, color: STATUS_COLORS.rejected },
  ].filter(d => d.value > 0), [stats]);

  // Recent activity from audit log + recent expenses
  const recentExpenses = [...companyExpenses]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const recentAuditLog = auditLog.slice(0, 5);

  const getStatusBadge = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      draft: <Badge variant="secondary">Draft</Badge>,
      pending: <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>,
      approved: <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>,
      rejected: <Badge variant="destructive">Rejected</Badge>,
    };
    return map[status] || <Badge variant="secondary">{status}</Badge>;
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVE')) return 'text-green-600';
    if (action.includes('REJECT')) return 'text-red-600';
    if (action.includes('CREATED')) return 'text-blue-600';
    if (action.includes('OVERRIDE')) return 'text-purple-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Admin Dashboard"
        description={`${company.name} — Enterprise Control Center`}
        action={
          <Link href="/dashboard/employee/expenses/new">
            <Button><Plus className="w-4 h-4 mr-2" />New Expense</Button>
          </Link>
        }
      />

      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-100 text-blue-600', href: '/dashboard/admin/users' },
            { label: 'Total Expenses', value: stats.totalExpenses, icon: FileText, color: 'bg-indigo-100 text-indigo-600', href: '/dashboard/admin/expenses' },
            { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'bg-amber-100 text-amber-600', href: '/dashboard/admin/expenses' },
            { label: 'Approved This Period', value: stats.approved, icon: CheckCircle2, color: 'bg-green-100 text-green-600', href: '/dashboard/admin/expenses' },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{label}</p>
                    </div>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {company?.country?.currency?.symbol || '$'}
                    {(stats.totalApprovedAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Approved Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-100">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100">
                  <GitBranch className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workflows.length}</p>
                  <p className="text-sm text-muted-foreground">Active Workflows</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Monthly Expense Trend
              </CardTitle>
              <CardDescription>Number of expenses submitted per month (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Pie */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Status</CardTitle>
              <CardDescription>Current distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No expense data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v, n]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for pending */}
        {pendingApprovals.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">{pendingApprovals.length} expense{pendingApprovals.length > 1 ? 's' : ''} pending your review</p>
                    <p className="text-sm text-amber-600">These require admin approval action</p>
                  </div>
                </div>
                <Link href="/dashboard/admin/expenses?filter=pending">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    Review Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom: Recent Expenses + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Expense Submissions</CardTitle>
                <CardDescription>Latest across all employees</CardDescription>
              </div>
              <Link href="/dashboard/admin/expenses">
                <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentExpenses.map(expense => {
                  const submitter = users.find(u => u.id === expense.submittedBy);
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {submitter?.avatar || submitter?.name.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">{submitter?.name} · {format(new Date(expense.expenseDate), 'MMM d')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {company.country.currency.symbol}{(expense.convertedAmount || expense.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                        {getStatusBadge(expense.status)}
                      </div>
                    </div>
                  );
                })}
                {recentExpenses.length === 0 && (
                  <p className="text-center py-6 text-sm text-muted-foreground">No expenses submitted yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system actions</CardDescription>
              </div>
              <Link href="/dashboard/admin/audit">
                <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentAuditLog.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <Shield className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No audit events yet. Events appear here as actions are taken.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAuditLog.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium mt-0.5">
                        {log.userName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${getActionColor(log.actionType)}`}>
                            {log.actionType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{log.entityName}</p>
                        <p className="text-xs text-muted-foreground">{log.userName} · {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Quick Actions</CardTitle>
            <CardDescription>Jump to any admin function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Manage Users', href: '/dashboard/admin/users', icon: Users, color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
                { label: 'Hierarchy', href: '/dashboard/admin/hierarchy', icon: GitBranch, color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
                { label: 'Workflows', href: '/dashboard/admin/workflows', icon: GitBranch, color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
                { label: 'Audit Logs', href: '/dashboard/admin/audit', icon: Activity, color: 'bg-green-50 border-green-200 hover:bg-green-100' },
                { label: 'All Expenses', href: '/dashboard/admin/expenses', icon: FileText, color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
                { label: 'Analytics', href: '/dashboard/admin/analytics', icon: TrendingUp, color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
                { label: 'Reports / Export', href: '/dashboard/admin/reports', icon: DollarSign, color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
                { label: 'Settings', href: '/dashboard/admin/settings', icon: Shield, color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${color}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
