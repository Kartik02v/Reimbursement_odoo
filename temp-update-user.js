const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@acme.com'; // Adjust if the user's email is different

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`User with email ${email} not found.`);
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'admin',
      permissions: {
        canViewAllExpenses: true,
        canApproveAllExpenses: true,
        canManageUsers: true,
        canConfigureWorkflows: true,
      },
    },
  });

  console.log(`Updated user ${updatedUser.email} with full admin permissions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
