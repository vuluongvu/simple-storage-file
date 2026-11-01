import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // Bypass transformation for file downloads or streamable files
        if (
          data instanceof StreamableFile ||
          Buffer.isBuffer(data) ||
          response.headersSent
        ) {
          return data;
        }

        const message = data?.message || 'Success';
        const resultData =
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'message' in data
            ? data.data
            : data;

        return {
          statusCode,
          message,
          data: resultData ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
