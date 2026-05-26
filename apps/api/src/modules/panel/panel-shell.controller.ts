import { Controller, Get, Header } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Serves the Vite-built single-page React app from apps/web/dist.
 * Both `/` and `/admin` (plus any nested route) yield the same shell;
 * client-side routing picks the right page. Static assets are served
 * by fastifyStatic registered in main.ts.
 */
let cachedHtml: string | null = null;

function indexHtml(): string {
  if (cachedHtml !== null) return cachedHtml;
  const url = new URL("../../../../web/dist/index.html", import.meta.url);
  try {
    cachedHtml = readFileSync(fileURLToPath(url), "utf-8");
  } catch {
    cachedHtml =
      '<!doctype html><html><head><meta charset="utf-8"><title>Sukashi</title></head><body><div id="root">Sukashi web bundle missing. Run `pnpm --filter @sukashi/web build`.</div></body></html>';
  }
  return cachedHtml;
}

@Controller()
export class PanelShellController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  userPanel() {
    return indexHtml();
  }

  @Get("admin")
  @Header("Content-Type", "text/html; charset=utf-8")
  adminPanel() {
    return indexHtml();
  }
}
