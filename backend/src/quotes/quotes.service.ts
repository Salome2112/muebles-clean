import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { serializeDecimal } from '../common/prisma-serializer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  private readonly taxRate = 0.15;

  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteDto: CreateQuoteDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: createQuoteDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const productIds = [...new Set(createQuoteDto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o mas productos no existen');
    }

    const productsById = new Map(products.map((product) => [product.id, product]));

    const items = createQuoteDto.items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      return {
        productId: product.id,
        productName: product.name,
        unitPrice: Number(product.price),
        quantity: item.quantity,
        subtotal: this.toMoney(Number(product.price) * item.quantity),
      };
    });

    const subtotal = this.toMoney(
      items.reduce((accumulator, item) => accumulator + item.subtotal, 0),
    );
    const tax = this.toMoney(subtotal * this.taxRate);
    const discount = this.toMoney(createQuoteDto.discount ?? 0);
    const total = this.toMoney(subtotal + tax - discount);

    if (total < 0) {
      throw new BadRequestException('El total no puede ser negativo');
    }

    const quote = await this.prisma.quote.create({
      data: {
        code: this.generateCode('COT'),
        clientId: createQuoteDto.clientId,
        notes: createQuoteDto.notes,
        subtotal,
        tax,
        discount,
        total,
        items: {
          create: items,
        },
      },
      include: {
        client: true,
        items: true,
        settlement: true,
      },
    });

    return serializeDecimal(quote);
  }

  async findAll(search?: string) {
    const where: Prisma.QuoteWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            {
              client: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const quotes = await this.prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        items: true,
        settlement: true,
      },
    });

    return serializeDecimal(quotes);
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
        settlement: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    return serializeDecimal(quote);
  }

  async updateStatus(id: string, updateQuoteStatusDto: UpdateQuoteStatusDto) {
    await this.ensureExists(id);

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: updateQuoteStatusDto.status,
      },
      include: {
        client: true,
        items: true,
        settlement: true,
      },
    });

    return serializeDecimal(quote);
  }

  async remove(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { settlement: true },
    });

    if (!quote) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quote.settlement) {
      throw new BadRequestException(
        'No puedes eliminar una cotizacion con liquidacion asociada',
      );
    }

    await this.prisma.quote.delete({
      where: { id },
    });
  }

  async findPendingForSettlement() {
    const quotes = await this.prisma.quote.findMany({
      where: {
        settlement: {
          is: null,
        },
        status: {
          in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.ACCEPTED],
        },
      },
      include: {
        client: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializeDecimal(quotes);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.quote.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Cotizacion no encontrada');
    }
  }

  private toMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private generateCode(prefix: string) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const random = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestamp}-${random}`;
  }
}
