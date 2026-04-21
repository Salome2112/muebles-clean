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
exports.SettlementsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_serializer_1 = require("../common/prisma-serializer");
const prisma_service_1 = require("../prisma/prisma.service");
let SettlementsService = class SettlementsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createSettlementDto) {
        const quote = await this.prisma.quote.findUnique({
            where: { id: createSettlementDto.quoteId },
            include: {
                client: true,
                items: true,
                settlement: true,
            },
        });
        if (!quote) {
            throw new common_1.NotFoundException('Cotizacion no encontrada');
        }
        if (quote.settlement) {
            throw new common_1.BadRequestException('La cotizacion ya tiene una liquidacion');
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
        return (0, prisma_serializer_1.serializeDecimal)(settlement);
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
        return (0, prisma_serializer_1.serializeDecimal)(settlements);
    }
    async findOne(id) {
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
            throw new common_1.NotFoundException('Liquidacion no encontrada');
        }
        return (0, prisma_serializer_1.serializeDecimal)(settlement);
    }
    async markAsPaid(id) {
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
            throw new common_1.NotFoundException('Liquidacion no encontrada');
        }
        if (settlement.status === client_1.SettlementStatus.PAID) {
            return (0, prisma_serializer_1.serializeDecimal)(settlement);
        }
        const productIds = settlement.quote.items.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
        });
        const productsById = new Map(products.map((product) => [product.id, product]));
        settlement.quote.items.forEach((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
                throw new common_1.NotFoundException(`Producto ${item.productId} no encontrado`);
            }
            if (product.stock < item.quantity) {
                throw new common_1.BadRequestException(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
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
                    status: client_1.SettlementStatus.PAID,
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
        return (0, prisma_serializer_1.serializeDecimal)(paidSettlement);
    }
    async remove(id) {
        const settlement = await this.prisma.settlement.findUnique({
            where: { id },
        });
        if (!settlement) {
            throw new common_1.NotFoundException('Liquidacion no encontrada');
        }
        if (settlement.status === client_1.SettlementStatus.PAID) {
            throw new common_1.BadRequestException('No puedes eliminar una liquidacion ya marcada como pagada');
        }
        await this.prisma.settlement.delete({
            where: { id },
        });
    }
    generateCode() {
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, '')
            .slice(0, 14);
        const random = Math.floor(Math.random() * 900 + 100);
        return `LIQ-${timestamp}-${random}`;
    }
};
exports.SettlementsService = SettlementsService;
exports.SettlementsService = SettlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettlementsService);
//# sourceMappingURL=settlements.service.js.map