'use client';

import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { TeamStatsGrid } from './team-stats-grid';
import { MemberTable } from './member-table';
import type { User } from '@/lib/types';

interface ExpenseStats {
  pendingCount: number;
  totalAmount: number;
  totalCount: number;
}

interface TeamDetailViewProps {
  teamName: string;
  members: User[];
  getUserExpenseStats: (userId: string) => ExpenseStats;
  onBack: () => void;
}

export function TeamDetailView({
  teamName,
  members,
  getUserExpenseStats,
  onBack,
}: TeamDetailViewProps) {
  const totalExpenses = members.reduce(
    (sum, m) => sum + getUserExpenseStats(m.id).totalCount,
    0
  );
  const pendingExpenses = members.reduce(
    (sum, m) => sum + getUserExpenseStats(m.id).pendingCount,
    0
  );
  const uniqueRoles = [...new Set(members.map((m) => m.role))].length;

  return (
    <div className="min-h-screen">
      <Header
        title={`${teamName} Team`}
        description={`Managing ${members.length} members in the ${teamName} department`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Button>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {/* Team Stats */}
        <TeamStatsGrid
          variant="detail"
          memberCount={members.length}
          pendingExpenses={pendingExpenses}
          uniqueRoles={uniqueRoles}
          totalExpenses={totalExpenses}
        />

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>All members in the {teamName} department</CardDescription>
          </CardHeader>
          <CardContent>
            <MemberTable members={members} getUserExpenseStats={getUserExpenseStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}