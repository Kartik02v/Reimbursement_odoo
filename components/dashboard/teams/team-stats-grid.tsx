'use client';

import { Users, Building2, Receipt, ShieldCheck, User as UserIcon } from 'lucide-react';
import { StatsCard } from './stats-card';

interface TeamStatsGridProps {
  variant: 'overview' | 'detail';
  teamCount?: number;
  memberCount: number;
  pendingExpenses: number;
  uniqueRoles: number;
  totalExpenses?: number;
}

export function TeamStatsGrid({
  variant,
  teamCount,
  memberCount,
  pendingExpenses,
  uniqueRoles,
  totalExpenses,
}: TeamStatsGridProps) {
  if (variant === 'overview') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Building2}
          iconClassName="text-primary"
          iconBgClassName="bg-primary/10"
          value={teamCount || 0}
          label="Departments"
        />
        <StatsCard
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-100"
          value={memberCount}
          label="Total Members"
        />
        <StatsCard
          icon={Receipt}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-100"
          value={pendingExpenses}
          label="Pending Expenses"
        />
        <StatsCard
          icon={ShieldCheck}
          iconClassName="text-green-600"
          iconBgClassName="bg-green-100"
          value={uniqueRoles}
          label="Unique Roles"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <StatsCard
        icon={Users}
        iconClassName="text-primary"
        iconBgClassName="bg-primary/10"
        value={memberCount}
        label="Team Members"
      />
      <StatsCard
        icon={Receipt}
        iconClassName="text-green-600"
        iconBgClassName="bg-green-100"
        value={totalExpenses || 0}
        label="Total Expenses"
      />
      <StatsCard
        icon={ShieldCheck}
        iconClassName="text-amber-600"
        iconBgClassName="bg-amber-100"
        value={pendingExpenses}
        label="Pending Approvals"
      />
      <StatsCard
        icon={UserIcon}
        iconClassName="text-blue-600"
        iconBgClassName="bg-blue-100"
        value={uniqueRoles}
        label="Unique Roles"
      />
    </div>
  );
}