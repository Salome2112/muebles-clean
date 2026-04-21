import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { serializeDecimal } from '../common/prisma-serializer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSettlementDto: CreateSettlementDto) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: createSettlementDto.quoteId },
      include: {
        client: true,
        items: true,
        settlement: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quote.settlement) {
      throw new BadRequestException('La cotizacion ya tiene una liquidacion');
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        code: this.generateCode(),
        quoteId: quote.id,
        subtotal: Number(quote.subtotal),
        tax: Number(quote.tax),
        discount: Number(quote.discount),
        total: Number(quote.total),
        notes: createSettlementDto.notes,
      },
      include: {
        quote: {
          include: {
            client: true,
            items: true,
          },
        },
      },
    });

    return serializeDecimal(settlement);
  }

  async findAll() {
    const settlements = await this.prisma.settlement.findMany({
      include: {
        quote: {
          include: {
            client: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializeDecimal(settlements);
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            client: true,
            items: true,
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    return serializeDecimal(settlement);
  }

  async markAsPaid(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    if (settlement.status === SettlementStatus.PAID) {
      return serializeDecimal(settlement);
    }

    const productIds = settlement.quote.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    settlement.quote.items.forEach((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
        );
      }
    });

    const paidSettlement = await this.prisma.$transaction(async (transaction) => {
      for (const item of settlement.quote.items) {
        await transaction.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return transaction.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.PAID,
          paidAt: new Date(),
        },
        include: {
          quote: {
            include: {
              client: true,
              items: true,
            },
          },
        },
      });
    });

    return serializeDecimal(paidSettlement);
  }

  async remove(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    if (settlement.status === SettlementStatus.PAID) {
      throw new BadRequestException(
        'No puedes eliminar una liquidacion ya marcada como pagada',
      );
    }

    await this.prisma.settlement.delete({
      where: { id },
    });
  }

  private generateCode() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const random = Math.floor(Math.random() * 900 + 100);
    return `LIQ-${timestamp}-${random}`;
  }
}
