'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Mail, 
  Shield, 
  Building2, 
  Calendar, 
  Lock, 
  Bell, 
  Save, 
  UserCircle 
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, company } = useAuth();
  const { users } = useExpenses();

  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    push: false,
  });

  if (!user || !company) return null;

  const manager = users.find(u => u.id === user.managerId);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUpdating(false);
    setPasswordData({ current: '', new: '', confirm: '' });
    alert('Password updated successfully!');
  };

  const handleSavePreferences = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUpdating(false);
    alert('Preferences saved successfully!');
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Profile" 
        description="Manage your personal information and preferences" 
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Summary */}
          <Card className="md:col-span-1">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4">
                  {user.avatar || user.name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{company.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{format(new Date(user.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Your account details and company role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-base font-semibold">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <p className="text-base font-semibold">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-base font-semibold capitalize">{user.role}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Reports To</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <p className="text-base font-semibold">{manager?.name || 'No Direct Manager'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-base font-semibold">Operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Update your login credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
                    <Input 
                      id="current-password" 
                      type="password" 
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    />
                  </Field>
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isUpdating || !passwordData.current || !passwordData.new || passwordData.new !== passwordData.confirm}
                    >
                      Update Password
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Configure how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive expense status updates via email</p>
                </div>
                <Switch 
                  checked={notifications.email} 
                  onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} 
                />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">In-app Notifications</p>
                  <p className="text-xs text-muted-foreground">See notifications in the dashboard</p>
                </div>
                <Switch 
                  checked={notifications.inApp} 
                  onCheckedChange={(v) => setNotifications({ ...notifications, inApp: v })} 
                />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Mobile browser push notifications</p>
                </div>
                <Switch 
                  checked={notifications.push} 
                  onCheckedChange={(v) => setNotifications({ ...notifications, push: v })} 
                />
              </div>
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSavePreferences} 
                  className="w-full" 
                  variant="outline"
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
