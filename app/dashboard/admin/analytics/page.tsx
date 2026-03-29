'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  BarChart3,
  PieChartIcon,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AnalyticsPage() {
  const { user, company } = useAuth();
  const { expenses, categories, users } = useExpenses();

  if (!user || !company || user.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Header title="Access Denied" />
        <div className="p-8">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const analytics = useMemo(() => {
    const companyExpenses = expenses.filter((e) => e.companyId === company.id);
    
    // Status counts
    const statusCounts = {
      total: companyExpenses.length,
      draft: companyExpenses.filter((e) => e.status === 'draft').length,
      pending: companyExpenses.filter((e) => e.status === 'pending').length,
      approved: companyExpenses.filter((e) => e.status === 'approved').length,
      rejected: companyExpenses.filter((e) => e.status === 'rejected').length,
    };

    // Total amounts
    const totalAmount = companyExpenses
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0);

    const pendingAmount = companyExpenses
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0);

    // By category
    const byCategory = categories.map((cat) => {
      const catExpenses = companyExpenses.filter((e) => e.category === cat.id);
      return {
        name: cat.name,
        count: catExpenses.length,
        amount: catExpenses.reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0),
      };
    }).filter((c) => c.count > 0).sort((a, b) => b.amount - a.amount);

    // By month (last 6 months)
    const byMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthExpenses = companyExpenses.filter((e) =>
        isWithinInterval(new Date(e.createdAt), { start: monthStart, end: monthEnd })
      );

      byMonth.push({
        month: format(monthDate, 'MMM'),
        total: monthExpenses.reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0),
        approved: monthExpenses
          .filter((e) => e.status === 'approved')
          .reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0),
        count: monthExpenses.length,
      });
    }

    // Top spenders
    const topSpenders = users
      .filter((u) => u.companyId === company.id)
      .map((u) => {
        const userExpenses = companyExpenses.filter((e) => e.submittedBy === u.id && e.status === 'approved');
        return {
          name: u.name,
          amount: userExpenses.reduce((sum, e) => sum + (e.convertedAmount || e.amount), 0),
          count: userExpenses.length,
        };
      })
      .filter((u) => u.count > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Status distribution for pie chart
    const statusDistribution = [
      { name: 'Approved', value: statusCounts.approved, color: '#10b981' },
      { name: 'Pending', value: statusCounts.pending, color: '#f59e0b' },
      { name: 'Rejected', value: statusCounts.rejected, color: '#ef4444' },
      { name: 'Draft', value: statusCounts.draft, color: '#6b7280' },
    ].filter((s) => s.value > 0);

    // Average approval time (mock calculation)
    const avgApprovalTime = 2.5; // days

    return {
      statusCounts,
      totalAmount,
      pendingAmount,
      byCategory,
      byMonth,
      topSpenders,
      statusDistribution,
      avgApprovalTime,
    };
  }, [expenses, categories, users, company]);

  const currentMonth = analytics.byMonth[analytics.byMonth.length - 1];
  const previousMonth = analytics.byMonth[analytics.byMonth.length - 2];
  const monthlyChange = previousMonth?.total
    ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
    : 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Analytics"
        description="Expense insights and spending trends"
      />

      <div className="p-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-bold">
                    {company.country.currency.symbol}
                    {analytics.totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {monthlyChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(monthlyChange).toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold">
                    {company.country.currency.symbol}
                    {analytics.pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics.statusCounts.pending} expenses awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{analytics.statusCounts.total}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics.statusCounts.approved} approved, {analytics.statusCounts.rejected} rejected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Approval Time</p>
                  <p className="text-2xl font-bold">{analytics.avgApprovalTime} days</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                From submission to approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Monthly Spending Trend
              </CardTitle>
              <CardDescription>Last 6 months expense totals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(value) => `${company.country.currency.symbol}${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${company.country.currency.symbol}${value.toLocaleString()}`,
                        'Amount',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={{ fill: '#4f46e5', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="approved"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2 }}
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Expense Status Distribution
              </CardTitle>
              <CardDescription>Breakdown by approval status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Total amounts per expense category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tickFormatter={(value) => `${company.country.currency.symbol}${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                    <Tooltip
                      formatter={(value: number) => [
                        `${company.country.currency.symbol}${value.toLocaleString()}`,
                        'Amount',
                      ]}
                    />
                    <Bar dataKey="amount" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Spenders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Spenders
              </CardTitle>
              <CardDescription>Employees with highest approved expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topSpenders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No expense data available</p>
              ) : (
                <div className="space-y-4">
                  {analytics.topSpenders.map((spender, index) => (
                    <div key={spender.name} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{spender.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {spender.count} expense{spender.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {company.country.currency.symbol}
                          {spender.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
