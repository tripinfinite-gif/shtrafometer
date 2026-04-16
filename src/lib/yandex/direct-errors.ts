/**
 * Typed exception for Yandex.Direct API v5 errors.
 * Phase 3A — docs/plan-ai-consultant.md
 */

export class DirectApiError extends Error {
  readonly name = 'DirectApiError';
  readonly errorCode: number | string;
  readonly errorString: string;
  readonly errorDetail: string;
  readonly requestId?: string;

  constructor(params: {
    errorCode: number | string;
    errorString: string;
    errorDetail?: string;
    requestId?: string;
  }) {
    super(
      `[YandexDirect] ${params.errorCode} ${params.errorString}` +
        (params.errorDetail ? ` — ${params.errorDetail}` : '') +
        (params.requestId ? ` (request_id=${params.requestId})` : ''),
    );
    this.errorCode = params.errorCode;
    this.errorString = params.errorString;
    this.errorDetail = params.errorDetail ?? '';
    this.requestId = params.requestId;
  }
}

/** Transport-level error (HTTP != 2xx, no parseable error envelope). */
export class DirectTransportError extends Error {
  readonly name = 'DirectTransportError';
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`[YandexDirect] HTTP ${status}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
  }
}
