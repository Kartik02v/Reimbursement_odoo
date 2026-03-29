'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
  value: number | string;
  label: string;
}

export function StatsCard({
  icon: Icon,
  iconClassName = 'text-primary',
  iconBgClassName = 'bg-primary/10',
  value,
  label,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${iconBgClassName}`}>
            <Icon className={`w-6 h-6 ${iconClassName}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}