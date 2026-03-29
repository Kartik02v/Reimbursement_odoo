import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { z } from 'zod';

const updateWorkflowSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  conditions: z.any().optional(),
  steps: z.array(z.object({
    id: z.string().optional(),
    order: z.number(),
    name: z.string(),
    type: z.enum(['sequential', 'parallel', 'any', 'percentage']),
    approvers: z.array(z.string()),
    requiredApprovals: z.number().optional(),
  })).optional(),
});

// GET /api/workflows/[id] - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!workflow || workflow.companyId !== session.user.companyId) {
      return apiError('Workflow not found', 404, 'NOT_FOUND');
    }

    return apiResponse(workflow);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/workflows/[id] - Update workflow
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (session.user.role !== 'admin' && !session.user.permissions?.canConfigureWorkflows) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = updateWorkflowSchema.parse(body);

    const targetWorkflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
    });

    if (!targetWorkflow || targetWorkflow.companyId !== session.user.companyId) {
      return apiError('Workflow not found', 404, 'NOT_FOUND');
    }

    const updatedWorkflow = await prisma.$transaction(async (tx: any) => {
      // 1. Update basic workflow details
      const wf = await tx.approvalWorkflow.update({
        where: { id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          isDefault: validatedData.isDefault,
          conditions: validatedData.conditions,
        },
      });

      // 2. Clear old steps and recreate new ones if provided
      if (validatedData.steps) {
        await tx.approvalStep.deleteMany({
          where: { workflowId: id },
        });

        await Promise.all(
          validatedData.steps.map((step) =>
            tx.approvalStep.create({
              data: {
                workflowId: id,
                order: step.order,
                name: step.name,
                type: step.type,
                approvers: step.approvers,
                requiredApprovals: step.requiredApprovals,
              },
            })
          )
        );
      }

      // If this is set as default, unset other defaults
      if (validatedData.isDefault) {
        await tx.approvalWorkflow.updateMany({
          where: {
            companyId: session.user.companyId,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.approvalWorkflow.findUnique({
        where: { id: wf.id },
        include: { steps: true },
      });
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        actionType: 'WORKFLOW_UPDATED',
        entityType: 'workflow',
        entityId: id,
        entityName: updatedWorkflow!.name,
        companyId: session.user.companyId,
        timestamp: new Date(),
        newValue: JSON.stringify(validatedData),
      },
    });

    return apiResponse(updatedWorkflow);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (session.user.role !== 'admin') {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const { id } = await params;
    const targetWorkflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
    });

    if (!targetWorkflow || targetWorkflow.companyId !== session.user.companyId) {
      return apiError('Workflow not found', 404, 'NOT_FOUND');
    }

    await prisma.approvalWorkflow.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        actionType: 'WORKFLOW_DELETED',
        entityType: 'workflow',
        entityId: id,
        entityName: targetWorkflow.name,
        companyId: session.user.companyId,
        timestamp: new Date(),
      },
    });

    return apiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
