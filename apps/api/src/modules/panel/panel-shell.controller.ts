import { Controller, Get, Header } from "@nestjs/common";
import { PanelShellService } from "./panel-shell.service.js";

@Controller()
export class PanelShellController {
  constructor(private readonly shell: PanelShellService) {}

  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  async index() {
    return this.shell.render();
  }
}
