'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';
import type { User } from '@/lib/types';

interface TeamCardProps {
  name: string;
  members: User[];
  pendingExpenses: number;
  onClick: () => void;
}

export function TeamCard({ name, members, pendingExpenses, onClick }: TeamCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl">{name}</CardTitle>
          <CardDescription>{members.length} Members</CardDescription>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Users className="w-6 h-6" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Member Avatars */}
        <div className="flex -space-x-2 overflow-hidden mb-4">
          {members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="inline-flex h-8 w-8 rounded-full ring-2 ring-background bg-muted items-center justify-center text-[10px] font-bold"
              title={member.name}
            >
              {member.avatar || member.name.charAt(0)}
            </div>
          ))}
          {members.length > 5 && (
            <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-background bg-muted items-center justify-center text-[10px] font-bold">
              +{members.length - 5}
            </div>
          )}
        </div>

        {/* Pending Expenses Badge */}
        {pendingExpenses > 0 && (
          <div className="mb-3">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {pendingExpenses} pending expenses
            </Badge>
          </div>
        )}

        {/* View Team Link */}
        <div className="flex items-center justify-between text-sm font-medium text-primary">
          <span>View Team</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}