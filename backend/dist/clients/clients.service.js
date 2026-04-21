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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_serializer_1 = require("../common/prisma-serializer");
const prisma_service_1 = require("../prisma/prisma.service");
let ClientsService = class ClientsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createClientDto) {
        const client = await this.prisma.client.create({
            data: createClientDto,
        });
        return (0, prisma_serializer_1.serializeDecimal)(client);
    }
    async findAll(search) {
        const where = search
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
        return (0, prisma_serializer_1.serializeDecimal)(clients);
    }
    async findOne(id) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                quotes: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente no encontrado');
        }
        return (0, prisma_serializer_1.serializeDecimal)(client);
    }
    async update(id, updateClientDto) {
        await this.ensureExists(id);
        const client = await this.prisma.client.update({
            where: { id },
            data: updateClientDto,
        });
        return (0, prisma_serializer_1.serializeDecimal)(client);
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.client.delete({
            where: { id },
        });
    }
    async ensureExists(id) {
        const exists = await this.prisma.client.findUnique({ where: { id } });
        if (!exists) {
            throw new common_1.NotFoundException('Cliente no encontrado');
        }
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map