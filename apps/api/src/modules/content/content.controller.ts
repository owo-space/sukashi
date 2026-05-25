import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AdminGuard, AuthenticatedGuard, StaffGuard } from "../auth/auth.guard.js";
import { dataResponse } from "../common/json.js";
import { PrismaService } from "../database/prisma.service.js";

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function asNullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function asNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

@Controller()
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get([":adminPath/notice/fetch", "staff/notice/fetch"])
  @UseGuards(StaffGuard)
  async adminNoticeFetch() {
    return dataResponse(
      await this.prisma.notice.findMany({ orderBy: [{ id: "desc" }] })
    );
  }

  @Get("user/notice/fetch")
  @UseGuards(AuthenticatedGuard)
  async userNoticeFetch() {
    return dataResponse(
      await this.prisma.notice.findMany({
        where: { show: true },
        orderBy: [{ id: "desc" }]
      })
    );
  }

  @Post([":adminPath/notice/save", ":adminPath/notice/update", "staff/notice/save", "staff/notice/update"])
  @UseGuards(StaffGuard)
  async saveNotice(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    const data = {
      title: String(body.title ?? ""),
      content: String(body.content ?? ""),
      show: Boolean(body.show),
      imgUrl: asNullableString(body.img_url ?? body.imgUrl),
      tags: asNullableString(body.tags),
      updatedAt: now
    };
    if (id) {
      return dataResponse(await this.prisma.notice.update({ where: { id }, data }));
    }
    return dataResponse(
      await this.prisma.notice.create({
        data: {
          ...data,
          createdAt: now
        }
      })
    );
  }

  @Post([":adminPath/notice/show"])
  @UseGuards(AdminGuard)
  async showNotice(@Body() body: Record<string, unknown>) {
    return dataResponse(
      await this.prisma.notice.findUnique({ where: { id: Number(body.id) } })
    );
  }

  @Post([":adminPath/notice/drop", "staff/notice/drop"])
  @UseGuards(StaffGuard)
  async dropNotice(@Body() body: Record<string, unknown>) {
    await this.prisma.notice.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Get([":adminPath/knowledge/fetch"])
  @UseGuards(AdminGuard)
  async adminKnowledgeFetch() {
    return dataResponse(
      await this.prisma.knowledge.findMany({
        orderBy: [{ sort: "asc" }, { id: "desc" }]
      })
    );
  }

  @Get("user/knowledge/fetch")
  @UseGuards(AuthenticatedGuard)
  async userKnowledgeFetch() {
    return dataResponse(
      await this.prisma.knowledge.findMany({
        where: { show: true },
        orderBy: [{ sort: "asc" }, { id: "desc" }]
      })
    );
  }

  @Get([":adminPath/knowledge/getCategory", "user/knowledge/getCategory"])
  async knowledgeCategories() {
    const rows = await this.prisma.knowledge.findMany({
      select: {
        category: true
      },
      distinct: ["category"],
      orderBy: [{ category: "asc" }]
    });
    return dataResponse(rows.map((row) => row.category));
  }

  @Post(":adminPath/knowledge/save")
  @UseGuards(AdminGuard)
  async saveKnowledge(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    const data = {
      language: String(body.language ?? "zh-CN"),
      category: String(body.category ?? ""),
      title: String(body.title ?? ""),
      body: String(body.body ?? ""),
      sort: asNullableNumber(body.sort),
      show: Boolean(body.show),
      updatedAt: now
    };
    if (id) {
      return dataResponse(
        await this.prisma.knowledge.update({
          where: { id },
          data
        })
      );
    }
    return dataResponse(
      await this.prisma.knowledge.create({
        data: {
          ...data,
          createdAt: now
        }
      })
    );
  }

  @Post(":adminPath/knowledge/show")
  @UseGuards(AdminGuard)
  async showKnowledge(@Body() body: Record<string, unknown>) {
    return dataResponse(
      await this.prisma.knowledge.findUnique({ where: { id: Number(body.id) } })
    );
  }

  @Post(":adminPath/knowledge/drop")
  @UseGuards(AdminGuard)
  async dropKnowledge(@Body() body: Record<string, unknown>) {
    await this.prisma.knowledge.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Post(":adminPath/knowledge/sort")
  @UseGuards(AdminGuard)
  async sortKnowledge(@Body() body: Record<string, unknown>) {
    const ids = Array.isArray(body.knowledge_ids) ? body.knowledge_ids : [];
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.knowledge.update({
          where: { id: Number(id) },
          data: {
            sort: index + 1,
            updatedAt: unixNow()
          }
        })
      )
    );
    return dataResponse(true);
  }
}
