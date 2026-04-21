import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { serializeDecimal } from '../common/prisma-serializer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        stock: createProductDto.stock ?? 0,
      },
    });

    return serializeDecimal(product);
  }

  async findAll(search?: string) {
    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return serializeDecimal(products);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return serializeDecimal(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.ensureExists(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    return serializeDecimal(product);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    await this.prisma.product.delete({
      where: { id },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Producto no encontrado');
    }
  }
}
