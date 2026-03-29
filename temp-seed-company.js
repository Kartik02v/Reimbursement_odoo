const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    if (company) {
      const exists = await prisma.expenseCategory.findFirst({
        where: { companyId: company.id },
      });
      
      if (!exists) {
        // 1. Create default categories
        const defaultCategories = [
          { name: 'Travel', icon: 'Plane' },
          { name: 'Food & Dining', icon: 'Utensils' },
          { name: 'Office Supplies', icon: 'Paperclip' },
          { name: 'Software/Subscriptions', icon: 'Monitor' },
          { name: 'Other', icon: 'MoreHorizontal' },
        ];

        await Promise.all(
          defaultCategories.map((cat) =>
            prisma.expenseCategory.create({
              data: {
                name: cat.name,
                icon: cat.icon,
                companyId: company.id,
              },
            })
          )
        );

        // 2. Create a default basic workflow
        const workflow = await prisma.approvalWorkflow.create({
          data: {
            name: 'Default Approval Policy',
            description: 'Standard multi-level approval for all expenses',
            isDefault: true,
            companyId: company.id,
            conditions: { any: true },
          },
        });

        // 3. Add a default "Manager Approval" step
        await prisma.approvalStep.create({
          data: {
            order: 1,
            name: 'Manager Review',
            type: 'any',
            approvers: [],
            workflowId: workflow.id,
          },
        });

        console.log(`Successfully seeded company: ${company.name} (${company.id})`);
      } else {
        console.log(`Company ${company.name} already has data`);
      }
    } else {
      console.log('No company found to seed');
    }
  } catch (error) {
    console.error('Error seeding company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
