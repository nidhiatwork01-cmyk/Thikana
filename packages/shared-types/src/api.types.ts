export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiErrorEnvelope | null;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
}
