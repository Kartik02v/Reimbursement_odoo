'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Receipt,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Settings,
  UserPlus,
  Mail,
  BarChart3,
  Activity,
  Calendar,
  ChevronRight,
  Eye,
  Wallet,
  Target,
  Award,
  Zap,
  ChevronDown,
} from 'lucide-react';
import {
  TeamCard,
  TeamStatsGrid,
  MemberTable,
  TeamDetailView,
} from '@/components/dashboard/teams';
import type { User } from '@/lib/types';
import { format, subDays, isWithinInterval } from 'date-fns';

// Stats Card Component with Trend
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
              {change && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${
                    changeType === 'positive'
                      ? 'text-green-600'
                      : changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {changeType === 'positive' ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : changeType === 'negative' ? (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  ) : null}
                  {change}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
      </CardContent>
    </Card>
  );
}

// Activity Item Component
function ActivityItem({
  user,
  action,
  target,
  time,
  type,
}: {
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'expense' | 'approval' | 'rejection' | 'join';
}) {
  const icons = {
    expense: <Receipt className="w-4 h-4 text-blue-500" />,
    approval: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    rejection: <XCircle className="w-4 h-4 text-red-500" />,
    join: <UserPlus className="w-4 h-4 text-purple-500" />,
  };

  const bgColors = {
    expense: 'bg-blue-50',
    approval: 'bg-green-50',
    rejection: 'bg-red-50',
    join: 'bg-purple-50',
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`p-2 rounded-full ${bgColors[type]}`}>{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user}</span>{' '}
          <span className="text-muted-foreground">{action}</span>{' '}
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// Team Performance Card
function TeamPerformanceCard({
  name,
  members,
  approved,
  pending,
  rejected,
  budget,
  spent,
  onClick,
}: {
  name: string;
  members: number;
  approved: number;
  pending: number;
  rejected: number;
  budget: number;
  spent: number;
  onClick?: () => void;
}) {
  const total = approved + pending + rejected;
  const budgetUsage = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 group cursor-pointer border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{members} team members</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expense Status */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expense Status</span>
              <span className="font-medium">{total} total</span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(approved / total) * 100}%` }}
              />
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${(pending / total) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(rejected / total) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {approved} Approved
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {pending} Pending
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {rejected} Rejected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Budget Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget Usage</span>
            <span className="font-medium">{budgetUsage.toFixed(0)}%</span>
          </div>
          <Progress value={budgetUsage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>${spent.toLocaleString()} spent</span>
            <span>${budget.toLocaleString()} budget</span>
          </div>
        </div>

        {/* Team Avatars */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex -space-x-2">
            {[...Array(Math.min(members, 4))].map((_, i) => (
              <Avatar key={i} className="w-8 h-8 border-2 border-background">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {String.fromCharCode(65 + i)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members > 4 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                +{members - 4}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            View Team
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact Quick Actions Dropdown
function QuickActionsDropdown() {
  const actions = [
    { icon: UserPlus, label: 'Add Member', primary: true },
    { icon: Receipt, label: 'Review Expenses' },
    { icon: Mail, label: 'Send Reminder' },
    { icon: BarChart3, label: 'View Reports' },
    { icon: Target, label: 'Set Budgets' },
    { icon: Settings, label: 'Team Settings' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick Actions
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, index) => (
          <DropdownMenuItem key={index} className={action.primary ? 'text-primary font-medium' : ''}>
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Top Performer Card
function TopPerformerCard({
  rank,
  name,
  department,
  metric,
  value,
  avatar,
}: {
  rank: number;
  name: string;
  department: string;
  metric: string;
  value: string;
  avatar?: string;
}) {
  const rankColors = {
    1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    2: 'bg-gray-100 text-gray-700 border-gray-200',
    3: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
          rankColors[rank as keyof typeof rankColors] || 'bg-muted text-muted-foreground'
        }`}
      >
        {rank}
      </div>
      <Avatar className="w-10 h-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{department}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{value}</p>
        <p className="text-xs text-muted-foreground">{metric}</p>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user, company } = useAuth();
  const { users, expenses } = useExpenses();

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('7d');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (!user) return null;

  // Get subordinates
  const getSubordinates = (managerId: string): User[] => {
    return users.filter((u) => u.managerId === managerId);
  };

  const mySubordinates = getSubordinates(user.id);

  // Group by department
  const teamsMap = mySubordinates.reduce(
    (acc, current) => {
      const dept = current.department || 'Other';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(current);
      return acc;
    },
    {} as Record<string, User[]>
  );

  const teamNames = Object.keys(teamsMap);
  const uniqueRoles = [...new Set(mySubordinates.map((u) => u.role))];

  // Get expense stats for a user
  const getUserExpenseStats = (userId: string) => {
    const userExpenses = expenses.filter((e) => e.submittedBy === userId);
    const pendingCount = userExpenses.filter((e) => e.status === 'pending').length;
    const approvedCount = userExpenses.filter((e) => e.status === 'approved').length;
    const rejectedCount = userExpenses.filter((e) => e.status === 'rejected').length;
    const totalAmount = userExpenses.reduce(
      (sum, e) => sum + (e.convertedAmount || e.amount),
      0
    );
    return { pendingCount, approvedCount, rejectedCount, totalAmount, totalCount: userExpenses.length };
  };

  // Calculate stats
  const totalMembers = mySubordinates.length;
  const totalPendingExpenses = mySubordinates.reduce(
    (sum, m) => sum + getUserExpenseStats(m.id).pendingCount,
    0
  );
  const totalApprovedExpenses = mySubordinates.reduce(
    (sum, m) => sum + getUserExpenseStats(m.id).approvedCount,
    0
  );
  const totalSpent = mySubordinates.reduce(
    (sum, m) => sum + getUserExpenseStats(m.id).totalAmount,
    0
  );

  // Get team pending expenses
  const getTeamPendingExpenses = (members: User[]) => {
    return members.reduce((sum, m) => sum + getUserExpenseStats(m.id).pendingCount, 0);
  };

  // Recent activity from real expenses
  const recentActivity = expenses
    .slice(0, 5)
    .map(exp => ({
      user: users.find(u => u.id === exp.submittedBy)?.name || 'Unknown',
      action: exp.status === 'pending' ? 'submitted expense' : exp.status === 'approved' ? 'approved' : 'rejected',
      target: exp.title,
      time: format(new Date(exp.updatedAt), 'MMM d, h:mm a'),
      type: exp.status === 'pending' ? 'expense' : exp.status === 'approved' ? 'approval' : 'rejection' as any
    }));

  // Top performers from real expenses
  const topPerformers = useMemo(() => {
    const userSpends = mySubordinates.map(m => ({
      name: m.name,
      department: m.department || 'N/A',
      amount: getUserExpenseStats(m.id).totalAmount
    }));
    
    return userSpends
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        department: p.department,
        metric: 'expenses',
        value: `$${p.amount.toLocaleString()}`
      }));
  }, [mySubordinates, expenses]);

  if (selectedTeam) {
    const teamMembers = teamsMap[selectedTeam] || [];
    return (
      <TeamDetailView
        teamName={selectedTeam}
        members={teamMembers}
        getUserExpenseStats={getUserExpenseStats}
        onBack={() => setSelectedTeam(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <Header
        title="Team Management"
        description="Monitor and manage your team's performance and expenses"
        action={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh Data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Report</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {teamNames.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No teams found</EmptyTitle>
              <EmptyDescription>You don't have any direct reports assigned to you.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {/* Compact Filters Bar with Quick Actions */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Quick Actions Dropdown - Compact on left */}
                <QuickActionsDropdown />
                
                <Separator orientation="vertical" className="h-8 hidden lg:block" />
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams or members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[240px] h-9"
                  />
                </div>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">This year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="gap-2 h-9">
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-1">View:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setViewMode('grid')}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setViewMode('list')}
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Team Members"
                value={totalMembers}
                change="+2 this month"
                changeType="positive"
                icon={Users}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
                subtitle={`${teamNames.length} departments`}
              />
              <StatCard
                title="Pending Approvals"
                value={totalPendingExpenses}
                change={totalPendingExpenses > 0 ? 'Needs attention' : 'All clear'}
                changeType={totalPendingExpenses > 0 ? 'negative' : 'positive'}
                icon={Clock}
                iconColor="text-amber-600"
                iconBg="bg-amber-100"
                subtitle="Awaiting your review"
              />
              <StatCard
                title="Approved This Month"
                value={totalApprovedExpenses}
                change="+15% vs last month"
                changeType="positive"
                icon={CheckCircle2}
                iconColor="text-green-600"
                iconBg="bg-green-100"
                subtitle="Successfully processed"
              />
              <StatCard
                title="Total Reimbursed"
                value={`$${totalSpent.toLocaleString()}`}
                change="+8% vs last month"
                changeType="positive"
                icon={Wallet}
                iconColor="text-purple-600"
                iconBg="bg-purple-100"
                subtitle="Current period"
              />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Teams Section - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="teams" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <TabsList>
                      <TabsTrigger value="teams" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Teams
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {teamNames.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="members" className="gap-2">
                        <Users className="w-4 h-4" />
                        All Members
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {totalMembers}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="teams" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamNames.map((name) => {
                        const members = teamsMap[name];
                        const stats = members.reduce(
                          (acc, m) => {
                            const s = getUserExpenseStats(m.id);
                            return {
                              approved: acc.approved + s.approvedCount,
                              pending: acc.pending + s.pendingCount,
                              rejected: acc.rejected + s.rejectedCount,
                              spent: acc.spent + s.totalAmount,
                            };
                          },
                          { approved: 0, pending: 0, rejected: 0, spent: 0 }
                        );

                        return (
                          <TeamPerformanceCard
                            key={name}
                            name={name}
                            members={members.length}
                            approved={stats.approved}
                            pending={stats.pending}
                            rejected={stats.rejected}
                            budget={50000}
                            spent={stats.spent}
                            onClick={() => setSelectedTeam(name)}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="members" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">All Team Members</CardTitle>
                        <CardDescription>
                          Complete list of all members across all your teams
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MemberTable
                          members={mySubordinates}
                          getUserExpenseStats={getUserExpenseStats}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Team Analytics</CardTitle>
                        <CardDescription>
                          Performance insights and trends
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px] flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                          <p className="text-muted-foreground text-sm">
                            Analytics dashboard coming soon
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar - 1 column */}
              <div className="space-y-4">
                {/* Pending Alerts */}
                {totalPendingExpenses > 0 && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-amber-100 shrink-0">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-amber-900 text-sm">
                            Pending Approvals
                          </h4>
                          <p className="text-xs text-amber-700 mt-1">
                            {totalPendingExpenses} expense{' '}
                            {totalPendingExpenses === 1 ? 'request' : 'requests'} waiting
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            Review Now
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                
                
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}