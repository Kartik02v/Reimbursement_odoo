'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Receipt,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Settings,
  GitBranch,
  BarChart3,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react';

const employeeLinks = [
  { href: '/dashboard/employee', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/employee/expenses', label: 'My Expenses', icon: FileText },
];

const managerLinks = [
  { href: '/dashboard/manager', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/employee/expenses', label: 'My Expenses', icon: FileText },
  { href: '/dashboard/manager/approvals', label: 'Approvals', icon: CheckSquare },
];

const adminLinks = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/employee/expenses', label: 'My Expenses', icon: FileText },
  { href: '/dashboard/manager/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/workflows', label: 'Workflows', icon: GitBranch },
  { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
];


export function Sidebar() {
  const pathname = usePathname();
  const { user, company, logout, switchRole } = useAuth();
  const { notifications } = useExpenses();

  if (!user) return null;

  const links = user.role === 'admin' ? adminLinks : user.role === 'manager' ? managerLinks : employeeLinks;
  const unreadCount = notifications.filter(n => n.userId === user.id && !n.read).length;

  const pendingApprovalsLink = links.find(l => l.href === '/dashboard/approvals');

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Receipt className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground">ExpenseFlow</span>
      </div>

      {/* Company Info */}
      {company && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent">
            <Building2 className="w-4 h-4 text-sidebar-accent-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{company.name}</p>
              <p className="text-xs text-muted-foreground">{company.country.currency.symbol} {company.country.currency.code}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            const showBadge = link.href === '/dashboard/approvals' && unreadCount > 0;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{link.label}</span>
                  {showBadge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {user.avatar || user.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => switchRole('admin')}>
              Switch to Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchRole('manager')}>
              Switch to Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchRole('employee')}>
              Switch to Employee
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
