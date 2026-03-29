'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useExpenses } from '@/lib/expense-context';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Plus,
  GitBranch,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  Users,
  ArrowRight,
  Layers,
  Zap,
  CheckCircle2,
  Star,
  DollarSign,
  Tag,
} from 'lucide-react';
import type { ApprovalWorkflow, ApprovalStep, ApprovalType, WorkflowCondition } from '@/lib/types';

export default function WorkflowsPage() {
  const { user, company } = useAuth();
  const { workflows, users, categories, createWorkflow, updateWorkflow, deleteWorkflow } = useExpenses();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    steps: [] as ApprovalStep[],
    conditions: [] as WorkflowCondition[],
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

  const companyWorkflows = workflows.filter((w) => w.companyId === company.id);
  const managers = users.filter((u) => u.role === 'admin' || u.role === 'manager');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isDefault: false,
      steps: [],
      conditions: [],
    });
  };

  const addStep = () => {
    const newStep: ApprovalStep = {
      id: `step-${Date.now()}`,
      order: formData.steps.length + 1,
      name: `Step ${formData.steps.length + 1}`,
      type: 'sequential',
      approvers: [],
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const updateStep = (index: number, updates: Partial<ApprovalStep>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const addCondition = () => {
    const newCondition: WorkflowCondition = {
      field: 'amount',
      operator: 'gt',
      value: 0,
    };
    setFormData({ ...formData, conditions: [...formData.conditions, newCondition] });
  };

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    const newConditions = formData.conditions.filter((_, i) => i !== index);
    setFormData({ ...formData, conditions: newConditions });
  };

  const handleCreate = () => {
    createWorkflow({
      name: formData.name,
      description: formData.description,
      companyId: company.id,
      isDefault: formData.isDefault,
      steps: formData.steps,
      conditions: formData.conditions.length > 0 ? formData.conditions : undefined,
    });
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEdit = () => {
    if (selectedWorkflow) {
      updateWorkflow(selectedWorkflow.id, {
        name: formData.name,
        description: formData.description,
        isDefault: formData.isDefault,
        steps: formData.steps,
        conditions: formData.conditions.length > 0 ? formData.conditions : undefined,
      });
      setShowEditDialog(false);
      setSelectedWorkflow(null);
      resetForm();
    }
  };

  const handleDelete = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      deleteWorkflow(workflowId);
    }
  };

  const openEditDialog = (workflow: ApprovalWorkflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      isDefault: workflow.isDefault,
      steps: workflow.steps,
      conditions: workflow.conditions || [],
    });
    setShowEditDialog(true);
  };

  const getApproverNames = (approverIds: string[]) => {
    return approverIds
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'No approvers';
  };

  const getStepTypeLabel = (type: ApprovalType) => {
    switch (type) {
      case 'sequential':
        return 'Sequential (one after another)';
      case 'parallel':
        return 'Parallel (any can approve)';
      case 'percentage':
        return 'Percentage-based';
      case 'any':
        return 'Any single approver';
      default:
        return type;
    }
  };

  const getConditionLabel = (condition: WorkflowCondition) => {
    const operators: Record<string, string> = {
      gt: 'greater than',
      lt: 'less than',
      eq: 'equals',
      in: 'is in',
    };

    if (condition.field === 'amount') {
      return `Amount ${operators[condition.operator]} $${condition.value}`;
    }
    if (condition.field === 'category') {
      const cat = categories.find((c) => c.id === condition.value);
      return `Category is ${cat?.name || condition.value}`;
    }
    return `${condition.field} ${operators[condition.operator]} ${condition.value}`;
  };

  const WorkflowForm = () => (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="wf-name">Workflow Name</FieldLabel>
          <Input
            id="wf-name"
            placeholder="e.g., High Value Approval"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="wf-description">Description</FieldLabel>
          <Textarea
            id="wf-description"
            placeholder="Describe when this workflow should be used..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </Field>
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div>
            <p className="font-medium">Default Workflow</p>
            <p className="text-sm text-muted-foreground">Use when no conditions match</p>
          </div>
          <Switch
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
          />
        </div>
      </FieldGroup>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium">Trigger Conditions</h4>
            <p className="text-sm text-muted-foreground">When should this workflow be used?</p>
          </div>
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-1" />
            Add Condition
          </Button>
        </div>
        {formData.conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic p-4 bg-muted rounded-lg">
            No conditions - workflow will need to be manually selected or set as default
          </p>
        ) : (
          <div className="space-y-3">
            {formData.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 rounded-lg border">
                <Select
                  value={condition.field}
                  onValueChange={(v) => updateCondition(index, { field: v as 'amount' | 'category' })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(v) => updateCondition(index, { operator: v as 'gt' | 'lt' | 'eq' })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">Greater than</SelectItem>
                    <SelectItem value="lt">Less than</SelectItem>
                    <SelectItem value="eq">Equals</SelectItem>
                  </SelectContent>
                </Select>

                {condition.field === 'amount' ? (
                  <Input
                    type="number"
                    placeholder="0"
                    value={condition.value as number}
                    onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                ) : (
                  <Select
                    value={condition.value as string}
                    onValueChange={(v) => updateCondition(index, { value: v })}
                  >
                    <SelectTrigger className="w-40">
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
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(index)}
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium">Approval Steps</h4>
            <p className="text-sm text-muted-foreground">Define the approval chain</p>
          </div>
          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>
        {formData.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground italic p-4 bg-muted rounded-lg">
            No steps defined - add at least one approval step
          </p>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {formData.steps.map((step, index) => (
              <AccordionItem key={step.id} value={step.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{step.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <Field>
                    <FieldLabel>Step Name</FieldLabel>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                      placeholder="e.g., Manager Approval"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Approval Type</FieldLabel>
                    <Select
                      value={step.type}
                      onValueChange={(v) => updateStep(index, { type: v as ApprovalType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="parallel">Parallel</SelectItem>
                        <SelectItem value="any">Any Single Approver</SelectItem>
                        <SelectItem value="percentage">Percentage-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Approvers</FieldLabel>
                    <Select
                      value={step.approvers[0] || ''}
                      onValueChange={(v) => {
                        const newApprovers = step.approvers.includes(v)
                          ? step.approvers.filter((a) => a !== v)
                          : [...step.approvers, v];
                        updateStep(index, { approvers: newApprovers });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select approvers" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {step.approvers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {step.approvers.map((approverId) => {
                          const approver = users.find((u) => u.id === approverId);
                          return (
                            <Badge key={approverId} variant="secondary" className="gap-1">
                              {approver?.name}
                              <button
                                onClick={() =>
                                  updateStep(index, {
                                    approvers: step.approvers.filter((a) => a !== approverId),
                                  })
                                }
                                className="ml-1 hover:text-destructive"
                              >
                                &times;
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </Field>
                  {(step.type === 'parallel' || step.type === 'percentage') && (
                    <Field>
                      <FieldLabel>Required Approvals</FieldLabel>
                      <Input
                        type="number"
                        min="1"
                        value={step.requiredApprovals || 1}
                        onChange={(e) =>
                          updateStep(index, { requiredApprovals: parseInt(e.target.value) || 1 })
                        }
                      />
                    </Field>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Step
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header
        title="Workflow Configuration"
        description="Configure approval workflows for expense requests"
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        }
      />

      <div className="p-8">
        {companyWorkflows.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon"><GitBranch /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No workflows configured</EmptyTitle>
              <EmptyDescription>Create your first approval workflow to get started</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companyWorkflows.map((workflow) => (
              <Card key={workflow.id} className="relative">
                {workflow.isDefault && (
                  <Badge className="absolute top-4 right-4 bg-primary/10 text-primary">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-primary" />
                        {workflow.name}
                      </CardTitle>
                      {workflow.description && (
                        <CardDescription className="mt-1">{workflow.description}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(workflow)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(workflow.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Conditions */}
                  {workflow.conditions && workflow.conditions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">TRIGGERS WHEN</p>
                      <div className="flex flex-wrap gap-2">
                        {workflow.conditions.map((condition, index) => (
                          <Badge key={index} variant="outline" className="gap-1">
                            {condition.field === 'amount' ? (
                              <DollarSign className="w-3 h-3" />
                            ) : (
                              <Tag className="w-3 h-3" />
                            )}
                            {getConditionLabel(condition)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps visualization */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">APPROVAL STEPS</p>
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{step.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getApproverNames(step.approvers)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {step.type}
                        </Badge>
                        {index < workflow.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Auto-approve indicators */}
                  {workflow.steps.some((s) => s.autoApproveConditions?.length) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Has auto-approve rules configured</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Define a new approval workflow with custom steps and conditions
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || formData.steps.length === 0}>
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Modify the workflow configuration
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || formData.steps.length === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
