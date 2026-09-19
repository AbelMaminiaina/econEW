import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Script de backfill idempotent (convention du projet : voir README) — crée le premier
// compte platform_admin à partir de PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD.
// Ne touche à aucune donnée existante (produits, commandes...).
async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('PLATFORM_ADMIN_EMAIL et PLATFORM_ADMIN_PASSWORD doivent être définis dans .env');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Le compte platform_admin ${email} existe déjà, rien à faire.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Plateforme',
      role: 'platform_admin',
    },
  });

  console.log(`Compte platform_admin créé : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
