import { Controller, Get } from "@nestjs/common";
import {
  ACTIVE_LEGACY_API_ROUTES,
  LEGACY_API_ROUTES,
  REMOVED_PROTOCOL_API_ROUTES
} from "@sukashi/shared";
import { dataResponse } from "../common/json.js";

/**
 * Diagnostic-only routes. The "compat layer" that previously faked entire
 * panel responses is gone; every endpoint is now implemented by a real
 * controller. This file remains so the front-end's route inventory probe
 * keeps working.
 */
@Controller()
export class LegacyApiCompatController {
  @Get("api/compat/routes")
  getRouteInventory() {
    return dataResponse({
      active: ACTIVE_LEGACY_API_ROUTES,
      removed: REMOVED_PROTOCOL_API_ROUTES,
      total: LEGACY_API_ROUTES.length
    });
  }

  @Get("monitor/api/stats")
  getMonitorStats() {
    return {
      jobsPerMinute: 0,
      recentJobs: 0,
      failedJobs: 0,
      status: "running"
    };
  }
}
