import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  apiResponse,
  apiError,
  handleApiError,
} from '@/lib/api-utils';
import { z } from 'zod';

const createWorkflowSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  conditions: z.any().optional(),
  steps: z.array(z.object({
    order: z.number(),
    name: z.string(),
    type: z.enum(['sequential', 'parallel', 'any', 'percentage']),
    approvers: z.array(z.string()),
    requiredApprovals: z.number().optional(),
  })),
});

// GET /api/workflows - List workflows for the company
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return apiResponse(workflows);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (session.user.role !== 'admin' && !session.user.permissions?.canConfigureWorkflows) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const validatedData = createWorkflowSchema.parse(body);

    // If this is set as default, unset other defaults in the same company
    if (validatedData.isDefault) {
      await prisma.approvalWorkflow.updateMany({
        where: {
          companyId: session.user.companyId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const workflow = await prisma.$transaction(async (tx: any) => {
      const wf = await tx.approvalWorkflow.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          isDefault: validatedData.isDefault,
          conditions: validatedData.conditions || { any: true },
          companyId: session.user.companyId,
        },
      });

      // Create steps
      await Promise.all(
        validatedData.steps.map((step) =>
          tx.approvalStep.create({
            data: {
              workflowId: wf.id,
              order: step.order,
              name: step.name,
              type: step.type,
              approvers: step.approvers,
              requiredApprovals: step.requiredApprovals,
            },
          })
        )
      );

      return tx.approvalWorkflow.findUnique({
        where: { id: wf.id },
        include: { steps: true },
      });
    });

    return apiResponse(workflow, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
