'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Download, Filter, ShieldAlert, FileText, User, GitBranch,
  CheckCircle2, XCircle, Clock, Edit, Trash2, Plus, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AuditActionType, AuditEntityType } from '@/lib/types';

function exportToCSV(data: Record<string, string | number>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getActionIcon(action: AuditActionType) {
  if (action.includes('APPROVE')) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (action.includes('REJECT')) return <XCircle className="w-4 h-4 text-red-600" />;
  if (action.includes('OVERRIDE')) return <ShieldAlert className="w-4 h-4 text-purple-600" />;
  if (action.includes('CREATED')) return <Plus className="w-4 h-4 text-blue-600" />;
  if (action.includes('EDITED')) return <Edit className="w-4 h-4 text-amber-600" />;
  if (action.includes('DELETED')) return <Trash2 className="w-4 h-4 text-red-600" />;
  if (action.includes('SUBMITTED')) return <Clock className="w-4 h-4 text-indigo-600" />;
  if (action.includes('RESUBMITTED')) return <Clock className="w-4 h-4 text-blue-600" />;
  return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
}

function getEntityIcon(entity: AuditEntityType) {
  if (entity === 'Expense') return <FileText className="w-3 h-3" />;
  if (entity === 'User') return <User className="w-3 h-3" />;
  if (entity === 'Workflow') return <GitBranch className="w-3 h-3" />;
  return null;
}

function getActionBadge(action: AuditActionType) {
  const label = action.replace(/_/g, ' ');
  if (action.includes('OVERRIDE')) return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{label}</Badge>;
  if (action.includes('APPROVE')) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{label}</Badge>;
  if (action.includes('REJECT')) return <Badge variant="destructive">{label}</Badge>;
  if (action.includes('CREATED')) return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{label}</Badge>;
  if (action.includes('DELETED')) return <Badge variant="destructive">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

const PAGE_SIZE = 15;

export default function AuditLogsPage() {
  const { user, company } = useAuth();
  const { auditLog } = useExpenses();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditActionType>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | AuditEntityType>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);

  const canViewAudit = user?.role === 'admin' || user?.permissions?.canViewAllExpenses;

  if (!user || !company || !canViewAudit) {
    return (
      <div className="min-h-screen">
        <Header title="Access Denied" />
        <div className="p-8">
          <p className="text-muted-foreground">Admin or elevated manager access required.</p>
        </div>
      </div>
    );
  }

  const filtered = useMemo(() => {
    let list = auditLog.filter(l => l.companyId === company.id);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => l.entityName.toLowerCase().includes(s) || l.userName.toLowerCase().includes(s) || l.actionType.toLowerCase().includes(s));
    }
    if (actionFilter !== 'all') list = list.filter(l => l.actionType === actionFilter);
    if (entityFilter !== 'all') list = list.filter(l => l.entityType === entityFilter);
    if (userFilter !== 'all') list = list.filter(l => l.userId === userFilter);
    return list;
  }, [auditLog, search, actionFilter, entityFilter, userFilter, company.id]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueUsers = Array.from(new Map(auditLog.map(l => [l.userId, l.userName])).entries());

  const actionTypes: AuditActionType[] = [
    'EXPENSE_CREATED', 'EXPENSE_EDITED', 'EXPENSE_DELETED', 'EXPENSE_SUBMITTED',
    'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_RESUBMITTED',
    'ADMIN_OVERRIDE_APPROVE', 'ADMIN_OVERRIDE_REJECT',
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
    'WORKFLOW_CREATED', 'WORKFLOW_UPDATED', 'WORKFLOW_DELETED',
  ];

  const handleExport = () => {
    const rows = filtered.map(l => ({
      Timestamp: format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      User: l.userName,
      Action: l.actionType,
      Entity: l.entityType,
      EntityName: l.entityName,
      EntityId: l.entityId,
      Comment: l.comment || '',
      OverrideType: l.overrideType || '',
      OldValue: l.oldValue || '',
      NewValue: l.newValue || '',
    }));
    exportToCSV(rows, `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  // Stats
  const overrides = filtered.filter(l => l.actionType.includes('OVERRIDE')).length;
  const approvals = filtered.filter(l => l.actionType === 'EXPENSE_APPROVED' || l.actionType === 'ADMIN_OVERRIDE_APPROVE').length;
  const rejections = filtered.filter(l => l.actionType === 'EXPENSE_REJECTED' || l.actionType === 'ADMIN_OVERRIDE_REJECT').length;

  return (
    <div className="min-h-screen">
      <Header
        title="Audit Logs"
        description="Complete trail of all system actions for compliance and fraud detection"
        action={
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export CSV ({filtered.length})
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: auditLog.filter(l => l.companyId === company.id).length, color: 'text-foreground', bg: '' },
            { label: 'Admin Overrides', value: overrides, color: 'text-purple-700', bg: 'border-purple-200 bg-purple-50' },
            { label: 'Approvals', value: approvals, color: 'text-green-700', bg: 'border-green-200 bg-green-50' },
            { label: 'Rejections', value: rejections, color: 'text-red-700', bg: 'border-red-200 bg-red-50' },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={bg}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by user, entity, or action…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={actionFilter} onValueChange={v => { setActionFilter(v as 'all' | AuditActionType); setPage(1); }}>
                <SelectTrigger className="w-52"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Action Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={v => { setEntityFilter(v as 'all' | AuditEntityType); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Workflow">Workflow</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={v => { setUserFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="User" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity Name</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Changes / Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No audit events found.</p>
                    <p className="text-xs mt-1">Audit events will appear here as actions are taken in the system.</p>
                  </TableCell>
                </TableRow>
              ) : paginated.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.actionType)}
                      {getActionBadge(log.actionType)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="text-sm">{log.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {getEntityIcon(log.entityType)}
                      {log.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium max-w-[180px] truncate">{log.entityName}</p>
                    <p className="text-xs text-muted-foreground">{log.entityId}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{format(new Date(log.timestamp), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 max-w-[240px]">
                      {log.comment && <p className="text-xs text-muted-foreground truncate" title={log.comment}>💬 {log.comment}</p>}
                      {log.oldValue && <p className="text-xs text-muted-foreground truncate" title={log.oldValue}>🔴 Old: {log.oldValue}</p>}
                      {log.newValue && <p className="text-xs text-muted-foreground truncate" title={log.newValue}>🟢 New: {log.newValue}</p>}
                      {log.overrideType && <Badge className="text-xs bg-purple-100 text-purple-700">{log.overrideType}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
