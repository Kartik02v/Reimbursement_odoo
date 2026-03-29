'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, Users, Shield, ShieldCheck, User as UserIcon, GitBranch,
} from 'lucide-react';
import type { User, UserRole } from '@/lib/types';

type TreeNode = User & { children: TreeNode[] };

function buildTree(users: User[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  users.forEach(u => map.set(u.id, { ...u, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach(node => {
    if (node.managerId && map.has(node.managerId)) {
      map.get(node.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function RoleIcon({ role }: { role: UserRole }) {
  if (role === 'admin') return <Shield className="w-4 h-4 text-primary" />;
  if (role === 'manager') return <ShieldCheck className="w-4 h-4 text-amber-600" />;
  return <UserIcon className="w-4 h-4 text-muted-foreground" />;
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') return <Badge className="bg-primary/10 text-primary text-xs">Admin</Badge>;
  if (role === 'manager') return <Badge className="bg-amber-100 text-amber-700 text-xs">Manager</Badge>;
  return <Badge variant="secondary" className="text-xs">Employee</Badge>;
}

function TreeNodeCard({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-dashed border-border pl-4' : ''}>
      <div className={`flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors hover:bg-muted/50 ${depth === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-background border border-border'}`}>
        {hasChildren && (
          <button onClick={() => setExpanded(e => !e)} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
          {node.avatar || node.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <RoleIcon role={node.role} />
            <span className="font-medium text-sm">{node.name}</span>
            <RoleBadge role={node.role} />
          </div>
          <p className="text-xs text-muted-foreground">{node.email}</p>
        </div>
        {hasChildren && (
          <Badge variant="outline" className="text-xs">
            {node.children.length} direct report{node.children.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="mb-2">
          {node.children.map(child => (
            <TreeNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyPage() {
  const { user, company } = useAuth();
  const { users } = useExpenses();
  const [expandAll, setExpandAll] = useState(true);

  if (!user || !company || user.role !== 'admin') {
    return (
      <div className="min-h-screen"><Header title="Access Denied" />
        <div className="p-8"><p className="text-muted-foreground">Admin access required.</p></div>
      </div>
    );
  }

  const companyUsers = users.filter(u => u.companyId === company.id);
  const tree = useMemo(() => buildTree(companyUsers), [companyUsers]);

  const statsByRole = {
    admin: companyUsers.filter(u => u.role === 'admin').length,
    manager: companyUsers.filter(u => u.role === 'manager').length,
    employee: companyUsers.filter(u => u.role === 'employee').length,
  };

  // Users with no manager assigned
  const unassigned = companyUsers.filter(u => u.role === 'employee' && !u.managerId);

  return (
    <div className="min-h-screen">
      <Header
        title="Hierarchy Management"
        description="Visual tree of your organization's reporting structure"
        action={
          <Button variant="outline" onClick={() => setExpandAll(e => !e)}>
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{statsByRole.admin}</p>
                  <p className="text-sm text-muted-foreground">Admin{statsByRole.admin !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{statsByRole.manager}</p>
                  <p className="text-sm text-muted-foreground">Manager{statsByRole.manager !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">{statsByRole.employee}</p>
                  <p className="text-sm text-muted-foreground">Employee{statsByRole.employee !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { label: 'Admin', color: 'bg-primary/10 border-primary/20', icon: <Shield className="w-3.5 h-3.5 text-primary" /> },
                { label: 'Manager', color: 'bg-background border-border', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> },
                { label: 'Employee', color: 'bg-background border-border', icon: <UserIcon className="w-3.5 h-3.5 text-muted-foreground" /> },
              ].map(({ label, color, icon }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded border ${color}`}>
                    {icon}
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronRight className="w-3 h-3" />
                <span>Click arrow to expand/collapse</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Organization Tree
            </CardTitle>
            <CardDescription>{companyUsers.length} team members · {company.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {tree.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No users yet. Add users from the Users & Roles page.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tree.map(node => (
                  <TreeNodeCard key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned employees warning */}
        {unassigned.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-amber-800 text-base flex items-center gap-2">
                ⚠️ Employees Without a Manager ({unassigned.length})
              </CardTitle>
              <CardDescription className="text-amber-600">
                These employees have no reporting manager assigned. Assign managers via Users & Roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(u => (
                  <Badge key={u.id} variant="outline" className="border-amber-300 text-amber-700">
                    {u.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
