import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { serializeDecimal } from '../common/prisma-serializer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: createClientDto,
    });

    return serializeDecimal(client);
  }

  async findAll(search?: string) {
    const where: Prisma.ClientWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const clients = await this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            quotes: true,
          },
        },
      },
    });

    return serializeDecimal(clients);
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return serializeDecimal(client);
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.ensureExists(id);

    const client = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });

    return serializeDecimal(client);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    await this.prisma.client.delete({
      where: { id },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.client.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Cliente no encontrado');
    }
  }
}
