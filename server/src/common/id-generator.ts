import { PrismaService } from '../prisma/prisma.service';
import { secureNumericCode } from './security.util';

function randomSuffix(digits = 6): string {
  return secureNumericCode(digits);
}

/**
 * Generate a collision-free student id (STU-XXXXXX). The legacy count-based
 * scheme (`STU-${count+1}`) collided under concurrent registrations and broke
 * when rows were ever deleted. Format stays human-readable for desk use.
 */
export async function generateUniqueStudentId(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `STU-${randomSuffix(6)}`;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) return id;
  }
  // Practically unreachable fallback with timestamp entropy.
  return `STU-${Date.now().toString(36).toUpperCase()}${randomSuffix(3)}`;
}

/** Collision-free academy card barcode, always matching /^ETOILE-\d+$/. */
export async function generateUniqueBarcode(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const barcode = `ETOILE-${randomSuffix(6)}`;
    const existing = await prisma.student.findUnique({ where: { barcode } });
    if (!existing) return barcode;
  }
  return `ETOILE-${Date.now().toString().slice(-6)}${randomSuffix(2)}`;
}

async function generateUniqueFamilyId(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `FAM-${randomSuffix(4)}`;
    const existing = await prisma.family.findUnique({ where: { id } });
    if (!existing) return id;
  }
  return `FAM-${Date.now().toString(36).toUpperCase()}`;
}

export interface FamilyIdentity {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

/**
 * Siblings must share one family record. Reuse an existing family matched by
 * phone (then email) before creating a new one. Updates the stored contact
 * details so the family row stays fresh.
 */
export async function findOrCreateFamily(prisma: PrismaService, identity: FamilyIdentity) {
  const phone = identity.parentPhone?.trim();
  const email = identity.parentEmail?.trim().toLowerCase();

  let family =
    (phone ? await prisma.family.findFirst({ where: { parentPhone: phone } }) : null) ||
    (email ? await prisma.family.findFirst({ where: { parentEmail: email } }) : null);

  if (family) {
    return prisma.family.update({
      where: { id: family.id },
      data: {
        parentName: identity.parentName,
        parentPhone: phone || family.parentPhone,
        parentEmail: email || family.parentEmail,
      },
    });
  }

  return prisma.family.create({
    data: {
      id: await generateUniqueFamilyId(prisma),
      parentName: identity.parentName,
      parentPhone: phone || '',
      parentEmail: email || '',
    },
  });
}
