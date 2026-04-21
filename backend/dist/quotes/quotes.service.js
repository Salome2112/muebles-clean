"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_serializer_1 = require("../common/prisma-serializer");
const prisma_service_1 = require("../prisma/prisma.service");
let QuotesService = class QuotesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.taxRate = 0.15;
    }
    async create(createQuoteDto) {
        const client = await this.prisma.client.findUnique({
            where: { id: createQuoteDto.clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente no encontrado');
        }
        const productIds = [...new Set(createQuoteDto.items.map((item) => item.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
        });
        if (products.length !== productIds.length) {
            throw new common_1.NotFoundException('Uno o mas productos no existen');
        }
        const productsById = new Map(products.map((product) => [product.id, product]));
        const items = createQuoteDto.items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
                throw new common_1.NotFoundException(`Producto ${item.productId} no encontrado`);
            }
            return {
                productId: product.id,
                productName: product.name,
                unitPrice: Number(product.price),
                quantity: item.quantity,
                subtotal: this.toMoney(Number(product.price) * item.quantity),
            };
        });
        const subtotal = this.toMoney(items.reduce((accumulator, item) => accumulator + item.subtotal, 0));
        const tax = this.toMoney(subtotal * this.taxRate);
        const discount = this.toMoney(createQuoteDto.discount ?? 0);
        const total = this.toMoney(subtotal + tax - discount);
        if (total < 0) {
            throw new common_1.BadRequestException('El total no puede ser negativo');
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
        return (0, prisma_serializer_1.serializeDecimal)(quote);
    }
    async findAll(search) {
        const where = search
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
        return (0, prisma_serializer_1.serializeDecimal)(quotes);
    }
    async findOne(id) {
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
            throw new common_1.NotFoundException('Cotizacion no encontrada');
        }
        return (0, prisma_serializer_1.serializeDecimal)(quote);
    }
    async updateStatus(id, updateQuoteStatusDto) {
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
        return (0, prisma_serializer_1.serializeDecimal)(quote);
    }
    async remove(id) {
        const quote = await this.prisma.quote.findUnique({
            where: { id },
            include: { settlement: true },
        });
        if (!quote) {
            throw new common_1.NotFoundException('Cotizacion no encontrada');
        }
        if (quote.settlement) {
            throw new common_1.BadRequestException('No puedes eliminar una cotizacion con liquidacion asociada');
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
                    in: [client_1.QuoteStatus.DRAFT, client_1.QuoteStatus.SENT, client_1.QuoteStatus.ACCEPTED],
                },
            },
            include: {
                client: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return (0, prisma_serializer_1.serializeDecimal)(quotes);
    }
    async ensureExists(id) {
        const exists = await this.prisma.quote.findUnique({ where: { id } });
        if (!exists) {
            throw new common_1.NotFoundException('Cotizacion no encontrada');
        }
    }
    toMoney(value) {
        return Number(value.toFixed(2));
    }
    generateCode(prefix) {
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, '')
            .slice(0, 14);
        const random = Math.floor(Math.random() * 900 + 100);
        return `${prefix}-${timestamp}-${random}`;
    }
};
exports.QuotesService = QuotesService;
exports.QuotesService = QuotesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotesService);
//# sourceMappingURL=quotes.service.js.map