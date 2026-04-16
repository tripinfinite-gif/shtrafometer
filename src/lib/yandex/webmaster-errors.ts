/**
 * Typed exceptions for Yandex.Webmaster API v4.
 * Phase 3C — docs/plan-ai-consultant.md
 */

export class WebmasterApiError extends Error {
  readonly name = 'WebmasterApiError';
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly availableValues?: string[];

  constructor(params: {
    errorCode: string;
    errorMessage: string;
    availableValues?: string[];
  }) {
    super(`[YandexWebmaster] ${params.errorCode}: ${params.errorMessage}`);
    this.errorCode = params.errorCode;
    this.errorMessage = params.errorMessage;
    this.availableValues = params.availableValues;
  }
}

/** Transport-level error (HTTP != 2xx, no parseable error envelope). */
export class WebmasterTransportError extends Error {
  readonly name = 'WebmasterTransportError';
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`[YandexWebmaster] HTTP ${status}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
  }
}
