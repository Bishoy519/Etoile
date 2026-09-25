import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination } from '../../common/pagination.util';
import { postVoucher } from '../accounting/gl-posting.util';
import { OpenWaService } from '../openwa/openwa.service';

export interface CheckoutDto {
  items: { productId: string; title?: string; size: string; quantity: number; price: number }[];
  paymentMethod: 'cash' | 'instapay' | 'card' | 'transfer' | 'wallet_debt';
  studentId?: string;
  customerName?: string;
  customerPhone?: string;
}

/** Authenticated checkout actor. Families/students may only charge their own household. */
export interface CheckoutActor {
  role?: string;
  familyId?: string;
  studentId?: string;
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly openWa?: OpenWaService,
  ) {}

  async getProducts(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 200, 1000);
    return this.prisma.product.findMany({
      include: {
        variants: {
          orderBy: { size: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
      skip,
      take,
    });
  }

  async addProduct(data: {
    title: string;
    titleAr?: string;
    category: string;
    price: number;
    sku: string;
    imageUrl?: string;
    variants?: { size: string; stock: number }[];
  }) {
    const existing = await this.prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new BadRequestException(`SKU ${data.sku} already exists`);

    const count = await this.prisma.product.count();
    const id = `PROD-${String(count + 1).padStart(2, '0')}`;

    const product = await this.prisma.product.create({
      data: {
        id,
        title: data.title,
        titleAr: data.titleAr || data.title,
        category: data.category,
        price: data.price,
        sku: data.sku,
        imageUrl:
          data.imageUrl ||
          'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80',
      },
    });

    if (data.variants && data.variants.length > 0) {
      for (const v of data.variants) {
        await this.prisma.productVariant.create({
          data: {
            productId: product.id,
            size: v.size,
            stock: v.stock,
          },
        });
      }
    }

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true },
    });
  }

  async updateProduct(id: string, data: any) {
    const { variants, ...updateData } = data;
    await this.prisma.product.update({
      where: { id },
      data: updateData,
    });
    return this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async updateStock(productId: string, size: string, newStock: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { productId, size },
    });

    if (variant) {
      await this.prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: Math.max(0, newStock) },
      });
    } else {
      await this.prisma.productVariant.create({
        data: {
          productId,
          size,
          stock: Math.max(0, newStock),
        },
      });
    }

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });
  }

  async getOrders(query?: { page?: string | number; limit?: string | number }) {
    const { skip, take } = parsePagination(query ?? {}, 100, 500);
    return this.prisma.boutiqueOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async processCheckout(dto: CheckoutDto, actor?: CheckoutActor) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Checkout requires at least one item');
    }

    // Server-authoritative pricing & stock: client-supplied prices are NEVER
    // trusted (they are only an echo for the receipt UI). Every line is
    // re-priced from the catalog and stock is validated before anything moves.
    const pricedItems: { productId: string; title: string; size: string; quantity: number; price: number }[] = [];
    for (const item of dto.items) {
      const qty = Math.floor(Number(item.quantity));
      if (!item.productId || !item.size || !Number.isFinite(qty) || qty <= 0) {
        throw new BadRequestException('Each checkout line needs a product, size and positive quantity');
      }
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant) {
        throw new BadRequestException(`Size ${item.size} is not sold for ${product.title}`);
      }
      if (variant.stock < qty) {
        throw new BadRequestException(
          `Insufficient stock for ${product.title} (${item.size}): requested ${qty}, available ${variant.stock}`,
        );
      }
      pricedItems.push({
        productId: product.id,
        title: product.title,
        size: item.size,
        quantity: qty,
        price: Number((product as unknown as { price: unknown }).price),
      });
    }

    const totalAmount = Math.round(pricedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) * 100) / 100;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx) => {
      let customerName = dto.customerName || 'Academy Guest';
      let ledgerStatus = 'settled';

      if (dto.paymentMethod === 'wallet_debt') {
        if (!dto.studentId) {
          throw new BadRequestException('Student ID is required to charge purchase to negative wallet');
        }

        const student = await tx.student.findUnique({ where: { id: dto.studentId } });
        if (!student) {
          throw new NotFoundException(`Student ${dto.studentId} not found`);
        }

        // Household scope for portal checkouts.
        if (actor?.role === 'family' && student.familyId !== actor.familyId) {
          throw new BadRequestException('You may only charge your own family account');
        }
        if (actor?.role === 'student' && student.id !== actor.studentId) {
          throw new BadRequestException('You may only charge your own student account');
        }

        customerName = student.name;
        const wallet = Number((student as unknown as { walletBalance: unknown }).walletBalance);
        const ceiling = Number((student as unknown as { maxNegativeDebt: unknown }).maxNegativeDebt);
        const projectedBalance = Math.round((wallet - totalAmount) * 100) / 100;

        if (projectedBalance < -ceiling) {
          throw new BadRequestException(
            `Transaction rejected: Credit ceiling exceeded. Student limit is -$${ceiling}, projected is -$${Math.abs(projectedBalance).toFixed(2)}.`
          );
        }

        // Debit wallet
        await tx.student.update({
          where: { id: student.id },
          data: {
            walletBalance: { decrement: totalAmount },
          },
        });

        ledgerStatus = 'charged_debt';
      }

      // Decrement variant stock (validated above — exact arithmetic, no silent flooring)
      for (const item of pricedItems) {
        const variant = await tx.productVariant.findFirst({
          where: { productId: item.productId, size: item.size },
        });
        if (variant) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: variant.stock - item.quantity,
            },
          });
        }
      }

      // Create order
      const order = await tx.boutiqueOrder.create({
        data: {
          orderNumber,
          studentId: dto.studentId || null,
          customerName,
          paymentMethod: dto.paymentMethod,
          totalAmount,
          ledgerStatus,
          items: {
            create: pricedItems.map((i) => ({
              productId: i.productId,
              title: i.title,
              size: i.size,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Create audit entry
      await tx.crmAuditEntry.create({
        data: {
          action: 'Boutique Sale',
          actor: 'POS Terminal',
          details: `Order ${orderNumber} for $${totalAmount} (${dto.paymentMethod})`,
          category: 'pos',
        },
      });

      // Auto-post retail voucher (best-effort, inside same txn for consistency).
      const debitSide = dto.paymentMethod === 'wallet_debt'
        ? { accountCode: '1200', accountName: 'Accounts Receivable' }
        : dto.paymentMethod === 'cash'
          ? { accountCode: '1010', accountName: 'Cash' }
          : dto.paymentMethod === 'instapay'
            ? { accountCode: '1025', accountName: 'InstaPay (Store)' }
            : { accountCode: '1020', accountName: 'Bank' };
      await postVoucher(tx as never, `POS ${orderNumber} — ${dto.paymentMethod} ${totalAmount}`, [
        { ...debitSide, debit: totalAmount },
        { accountCode: '4020', accountName: 'Retail Revenue', credit: totalAmount },
      ]).catch(() => null);

      // Send WhatsApp purchase receipt to the student/parent or walk-in customer if phone is available
      if (this.openWa) {
        let recipientPhone = dto.customerPhone?.trim();
        let recipientName = dto.customerName || 'Customer';

        if (dto.studentId) {
          const student = await tx.student.findUnique({
            where: { id: dto.studentId },
            select: { name: true, parentPhone: true, parentName: true },
          }).catch(() => null);

          if (student) {
            recipientPhone = student.parentPhone || recipientPhone;
            recipientName = student.parentName || student.name;
          }
        }

        if (recipientPhone) {
          const itemLines = pricedItems
            .map((i) => `• ${i.title} (${i.size}) ×${i.quantity} — EGP ${(i.price * i.quantity).toFixed(2)}`)
            .join('\n');

          const receiptBody =
            `🧾 *Étoile Ballet Academy — Purchase Receipt*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📋 *Order:* ${orderNumber}\n` +
            `👤 *Customer:* ${customerName}\n` +
            `📅 *Date:* ${new Date().toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n` +
            `🛍️ *Items:*\n${itemLines}\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Total:* EGP ${totalAmount.toFixed(2)}\n` +
            `💳 *Payment:* ${dto.paymentMethod.toUpperCase()}${ledgerStatus === 'charged_debt' ? ' (Charged to Account)' : ''}\n` +
            `✅ *Status:* Confirmed\n\n` +
            `Thank you for shopping at Étoile Boutique! 🌟\n` +
            `شكراً لتسوقكم في بوتيك إيتوال! 🌟`;

          // Fire-and-forget: never block the checkout response
          this.openWa.dispatchMessage({
            recipientPhone,
            recipientName,
            triggerEvent: 'purchase_receipt',
            language: 'en',
            customBody: receiptBody,
          }).catch(() => null);
        }
      }

      return {
        success: true,
        order,
        orderNumber,
        totalAmount,
        method: dto.paymentMethod,
        ledgerStatus,
      };
    });
  }
}
