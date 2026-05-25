import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

export class HttpOkInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    response.status(200);
    return next.handle().pipe(
      tap((value) => {
        if (value !== null && typeof value === "object" && !Buffer.isBuffer(value)) {
          response.header("Content-Type", "application/json");
        }
      })
    );
  }
}
