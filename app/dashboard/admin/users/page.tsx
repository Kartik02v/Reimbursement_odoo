'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Building2,
  Lock,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import type { User, UserRole, UserPermissions } from '@/lib/types';

export default function UsersPage() {
  const { user, company } = useAuth();
  const { users, createUser, updateUser, deleteUser, updateUserPermissions } = useExpenses();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as UserRole,
    managerId: '',
  });

  const [permissionsData, setPermissionsData] = useState<UserPermissions>({
    canViewAllExpenses: false,
    canApproveAllExpenses: false,
    canManageUsers: false,
    canConfigureWorkflows: false,
  });

  const canManage = user?.role === 'admin' || user?.permissions?.canManageUsers;

  if (!user || !company || !canManage) {
    return (
      <div className="min-h-screen">
        <Header title="Access Denied" />
        <div className="p-8">
          <p className="text-muted-foreground">Admin or elevated manager access required.</p>
        </div>
      </div>
    );
  }

  const companyUsers = users.filter((u) => u.companyId === company.id);
  const managers = companyUsers.filter((u) => u.role === 'admin' || u.role === 'manager');

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case 'manager':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Manager
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <UserIcon className="w-3 h-3 mr-1" />
            Employee
          </Badge>
        );
    }
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'None';
    return users.find((u) => u.id === managerId)?.name || 'Unknown';
  };

  const handleCreate = () => {
    createUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      managerId: (formData.managerId && formData.managerId !== 'none') ? formData.managerId : undefined,
      companyId: company.id,
      avatar: formData.name.split(' ').map((n) => n[0]).join('').toUpperCase(),
    });
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEdit = () => {
    if (selectedUser) {
      updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        managerId: (formData.managerId && formData.managerId !== 'none') ? formData.managerId : undefined,
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
    }
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser(userId);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      managerId: 'none',
    });
  };

  const openPermissionsDialog = (userToPermit: User) => {
    setSelectedUser(userToPermit);
    setPermissionsData(userToPermit.permissions || {
      canViewAllExpenses: false,
      canApproveAllExpenses: false,
      canManageUsers: false,
      canConfigureWorkflows: false,
    });
    setShowPermissionsDialog(true);
  };

  const handleSavePermissions = () => {
    if (selectedUser) {
      updateUserPermissions(selectedUser.id, permissionsData);
      setShowPermissionsDialog(false);
      setSelectedUser(null);
    }
  };

  const openEditDialog = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '', // Password remains empty unless changed (though not implemented in EDIT yet)
      role: userToEdit.role,
      managerId: userToEdit.managerId || 'none',
    });
    setShowEditDialog(true);
  };

  const stats = {
    total: companyUsers.length,
    admins: companyUsers.filter((u) => u.role === 'admin').length,
    managers: companyUsers.filter((u) => u.role === 'manager').length,
    employees: companyUsers.filter((u) => u.role === 'employee').length,
  };

  return (
    <div className="min-h-screen">
      <Header
        title="User Management"
        description="Manage team members and their roles"
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.managers}</p>
                  <p className="text-sm text-muted-foreground">Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
                  <UserIcon className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.employees}</p>
                  <p className="text-sm text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>All users in {company.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Reports To</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-medium">
                          {u.avatar || u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{getManagerName(u.managerId)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.role === 'manager' && (
                            <DropdownMenuItem onClick={() => openPermissionsDialog(u)}>
                              <Lock className="w-4 h-4 mr-2" />
                              Permissions
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEditDialog(u)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(u.id)}
                            className="text-destructive"
                            disabled={u.id === user.id}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new team member for {company.name}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {formData.role !== 'admin' && (
              <Field>
                <FieldLabel htmlFor="manager">Reports To</FieldLabel>
                <Select
                  value={formData.managerId}
                  onValueChange={(v) => setFormData({ ...formData, managerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.email}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and permissions
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-name">Full Name</FieldLabel>
              <Input
                id="edit-name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-email">Email</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-role">Role</FieldLabel>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {formData.role !== 'admin' && (
              <Field>
                <FieldLabel htmlFor="edit-manager">Reports To</FieldLabel>
                <Select
                  value={formData.managerId}
                  onValueChange={(v) => setFormData({ ...formData, managerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers
                      .filter((m) => m.id !== selectedUser?.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.email}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Management Permissions</DialogTitle>
            <DialogDescription>
              Grant system-wide access to <span className="font-semibold text-foreground">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="font-medium">View All Expenses</p>
                </div>
                <p className="text-sm text-muted-foreground">Manager can see expenses company-wide</p>
              </div>
              <Switch
                checked={permissionsData.canViewAllExpenses}
                onCheckedChange={(v) => setPermissionsData({ ...permissionsData, canViewAllExpenses: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <p className="font-medium">Admin Override</p>
                </div>
                <p className="text-sm text-muted-foreground">Directly approve or reject any expense</p>
              </div>
              <Switch
                checked={permissionsData.canApproveAllExpenses}
                onCheckedChange={(v) => setPermissionsData({ ...permissionsData, canApproveAllExpenses: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="font-medium">Manage Other Users</p>
                </div>
                <p className="text-sm text-muted-foreground">Add, edit, or remove company members</p>
              </div>
              <Switch
                checked={permissionsData.canManageUsers}
                onCheckedChange={(v) => setPermissionsData({ ...permissionsData, canManageUsers: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600" />
                  <p className="font-medium">Configure Workflows</p>
                </div>
                <p className="text-sm text-muted-foreground">Create and edit approval chains</p>
              </div>
              <Switch
                checked={permissionsData.canConfigureWorkflows}
                onCheckedChange={(v) => setPermissionsData({ ...permissionsData, canConfigureWorkflows: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
