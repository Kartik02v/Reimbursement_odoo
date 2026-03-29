'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Scan,
  Save,
  Send,
  Paperclip,
  ArrowLeft,
  Receipt,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { Expense } from '@/lib/types';

export default function NewExpensePage() {
  const router = useRouter();
  const { user, company, countries, currencyCode, currencySymbol } = useAuth();
  const { categories, createExpense } = useExpenses();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: currencyCode || 'USD',
    category: '',
    merchantName: '',
    paidBy: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  if (!user || !company) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR scanning
    setIsScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock OCR results
    const mockOCRResults = [
      { title: 'Business Lunch', merchantName: 'The Capital Grille', amount: '156.50', category: categories[1]?.id },
      { title: 'Office Supplies', merchantName: 'Staples', amount: '89.99', category: categories[2]?.id },
      { title: 'Flight Ticket', merchantName: 'United Airlines', amount: '425.00', category: categories[0]?.id },
      { title: 'Software License', merchantName: 'Adobe Inc.', amount: '59.99', category: categories[3]?.id },
    ];
    const randomResult = mockOCRResults[Math.floor(Math.random() * mockOCRResults.length)];

    setFormData((prev) => ({
      ...prev,
      ...randomResult,
      currency: prev.currency // Maintain user's currency choice
    }));
    setIsScanning(false);
  };

  const handleSave = async (shouldSubmit: boolean) => {
    setIsSaving(true);
    try {
      const expenseAmount = parseFloat(formData.amount) || 0;
      
      await createExpense({
        title: formData.title,
        description: formData.description,
        amount: expenseAmount,
        currency: formData.currency,
        category: formData.category,
        merchantName: formData.merchantName,
        expenseDate: formData.expenseDate,
        status: shouldSubmit ? 'pending' : 'draft',
        receiptUrl: receiptPreview || undefined,
        attachmentUrl: attachmentPreview || undefined,
        paidBy: formData.paidBy,
      });

      router.push('/dashboard/employee/expenses');
    } catch (error) {
      console.error('Failed to save expense:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="New Expense"
        description="Submit a new expense for reimbursement"
        action={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receipt Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Receipt
              </CardTitle>
              <CardDescription>
                Upload a receipt and we will auto-fill the details using OCR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-background/80 rounded-lg flex flex-col items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse mb-2" />
                      <p className="text-sm font-medium">Scanning receipt...</p>
                      <p className="text-xs text-muted-foreground">Extracting details with OCR</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Upload Receipt</p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to browse
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Scan className="w-4 h-4" />
                    Auto-fill with OCR
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Expense Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Expense Details
              </CardTitle>
              <CardDescription>Fill in the expense information</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    placeholder="e.g., Client Dinner, Flight to NYC"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="merchantName">Merchant Name</FieldLabel>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="merchantName"
                      placeholder="e.g., Restaurant Name, Airline"
                      value={formData.merchantName}
                      onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="amount">Amount</FieldLabel>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="currency">Currency</FieldLabel>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.currency.code} value={country.currency.code}>
                            {country.currency.symbol} {country.currency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="category">Category</FieldLabel>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="expenseDate">Date</FieldLabel>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="expenseDate"
                        type="date"
                        value={formData.expenseDate}
                        onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="paidBy">Paid By</FieldLabel>
                  <Input
                    id="paidBy"
                    placeholder="e.g., Personal, Company Card, Cash"
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Description (Optional)</FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="Add any additional details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </Field>

                <Field>
                  <FieldLabel>Attachment (Optional)</FieldLabel>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={attachmentInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachmentFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setAttachmentPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {attachmentPreview ? (
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                        <FileText className="w-8 h-8 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachmentFile?.name}</p>
                          <p className="text-xs text-muted-foreground">Attached</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive h-8 px-2"
                          onClick={() => {
                            setAttachmentFile(null);
                            setAttachmentPreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Add Attachment
                      </Button>
                    )}
                  </div>
                </Field>
              </FieldGroup>

              {formData.currency !== company.country.currency.code && formData.amount && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Amount will be converted to{' '}
                    <strong className="text-foreground">
                      {company.country.currency.code}
                    </strong>{' '}
                    for approval
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSave(false)}
                  disabled={isSaving || !formData.title || !formData.amount}
                >
                  {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save as Draft
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || !formData.title || !formData.amount || !formData.category}
                >
                  {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit for Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
