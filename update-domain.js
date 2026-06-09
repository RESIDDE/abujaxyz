import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateDomain() {
  const oldDomain = "@leksideexpo.com";
  const newDomain = "@lekksideexpo.com";

  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.email.includes(oldDomain)) {
      const newEmail = user.email.replace(oldDomain, newDomain);
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail }
      });
      console.log(`Updated user ${user.name} to ${newEmail}`);
    }
  }

  const emails = await prisma.email.findMany();
  for (const email of emails) {
    let changed = false;
    let data = {};
    
    if (email.fromAddress.includes(oldDomain)) {
      data.fromAddress = email.fromAddress.replace(oldDomain, newDomain);
      changed = true;
    }
    
    if (email.toAddresses.includes(oldDomain)) {
      data.toAddresses = email.toAddresses.replace(new RegExp(oldDomain, 'g'), newDomain);
      changed = true;
    }

    if (changed) {
      await prisma.email.update({
        where: { id: email.id },
        data
      });
      console.log(`Updated email ID ${email.id}`);
    }
  }

  console.log("Domain update complete.");
}

updateDomain()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
