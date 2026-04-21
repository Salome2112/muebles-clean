import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    ClientsModule,
    QuotesModule,
    SettlementsModule,
  ],
})
export class AppModule {}
