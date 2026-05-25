import { Controller, Get } from "@nestjs/common";
import {
  REMOVED_NODE_PROTOCOLS,
  RETAINED_NODE_PROTOCOLS,
  RETAINED_SUBSCRIPTION_FORMATS
} from "@sukashi/shared";

@Controller("api/v1/protocols")
export class ProtocolPolicyController {
  @Get("policy")
  policy() {
    return {
      retainedNodeProtocols: RETAINED_NODE_PROTOCOLS,
      removedNodeProtocols: REMOVED_NODE_PROTOCOLS,
      retainedSubscriptionFormats: RETAINED_SUBSCRIPTION_FORMATS
    };
  }
}
