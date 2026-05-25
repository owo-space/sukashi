import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function databaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://sukashi:sukashi@localhost:5432/sukashi"
  );
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl()
      })
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
