const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@lekksideexpo.com";
  
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existing) {
    console.log("Superadmin already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin12345", 12);

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "SUPERADMIN",
    }
  });

  console.log(`✅ Superadmin created!\nEmail: ${adminEmail}\nPassword: admin12345`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
