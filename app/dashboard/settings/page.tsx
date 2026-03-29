'use client';

import { useState } from 'react';
import { useAuth, countries } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Building2,
  Globe,
  CreditCard,
  Bell,
  Shield,
  Tag,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import type { Country } from '@/lib/types';

export default function SettingsPage() {
  const { user, company } = useAuth();
  const { categories } = useExpenses();

  const [companyName, setCompanyName] = useState(company?.name || '');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(company?.country || null);
  const [saved, setSaved] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnSubmission: true,
    emailOnApproval: true,
    emailOnRejection: true,
    emailDigest: false,
    browserNotifications: true,
  });

  if (!user || !company || user.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Header title="Access Denied" />
        <div className="p-8">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // In a real app, this would save to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        description="Configure your organization settings"
      />

      <div className="p-8 max-w-4xl">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company">
              <Building2 className="w-4 h-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Update your organization details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="country">Country & Currency</FieldLabel>
                    <Select
                      value={selectedCountry?.code || ''}
                      onValueChange={(value) => {
                        const country = countries.find((c) => c.code === value);
                        if (country) setSelectedCountry(country);
                      }}
                    >
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <SelectValue placeholder="Select country" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.currency.symbol} {country.currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {selectedCountry && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Base Currency</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {selectedCountry.currency.name} ({selectedCountry.currency.symbol})
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All expenses will be converted to this currency for reporting
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <Button onClick={handleSave}>
                    {saved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Email Notifications</h4>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Expense Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a new expense is submitted for approval
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailOnSubmission}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailOnSubmission: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Expense Approved</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your expense is approved
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailOnApproval}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailOnApproval: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Expense Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your expense is rejected
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailOnRejection}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailOnRejection: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly summary of all expense activity
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailDigest}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailDigest: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h4 className="text-sm font-medium">Browser Notifications</h4>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Enable Browser Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Show desktop notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.browserNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, browserNotifications: checked })
                      }
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <Button onClick={handleSave}>
                    {saved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Settings */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>
                    Manage the categories available for expense submissions
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Tag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {category.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage authentication and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all admin accounts
                      </p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Single Sign-On (SSO)</p>
                      <p className="text-sm text-muted-foreground">
                        Enable SSO with your identity provider
                      </p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Session Timeout</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out inactive users
                      </p>
                    </div>
                    <Select defaultValue="24">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Audit Logs</p>
                      <p className="text-sm text-muted-foreground">
                        Track all user actions and changes
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Logs
                    </Button>
                  </div>
                </div>

                <div className="pt-6">
                  <Button onClick={handleSave}>
                    {saved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
