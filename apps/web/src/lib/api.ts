import type { z } from 'zod';
import {
  HealthDto,
  LoginDto,
  LoginResponseDto,
  MeDto,
  UpdateMyNameDto,
} from '@evertrust/shared';
import { API_URL } from './env';

// Thrown for any non-2xx response. `status` lets callers branch (e.g. 401 ->
// show "invalid credentials") without parsing prose error bodies.
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  // Parsed-and-validated against this schema. Pass undefined for no body (e.g. 204).
  schema?: z.ZodTypeAny;
  body?: unknown;
  signal?: AbortSignal;
};

// Single choke point for every API call:
//  - always credentials:'include' so the httpOnly access_token cookie rides along
//    (cross-origin; the API enables CORS with credentials),
//  - validates the response against the @evertrust/shared contract so the UI fails
//    loud on drift instead of rendering undefined.
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', schema, body, signal } = opts;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    // Network/CORS failure — surface as a 0-status ApiError so callers handle it
    // the same way as HTTP errors.
    throw new ApiError(0, 'Network error: could not reach the API.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  if (!schema) {
    return undefined as T;
  }

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(res.status, 'Unexpected response shape from API.');
  }
  return parsed.data as T;
}

// Best-effort human message from a NestJS error body ({ message } | { message: [] }).
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'message' in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === 'string') return m;
      if (Array.isArray(m)) return m.join(', ');
    }
  } catch {
    // ignore — fall through to the status-based default
  }
  return `Request failed (${res.status}).`;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthDto>('/health', { schema: HealthDto, signal }),

  login: (input: z.infer<typeof LoginDto>) =>
    request<LoginResponseDto>('/auth/login', {
      method: 'POST',
      body: LoginDto.parse(input),
      schema: LoginResponseDto,
    }),

  me: (signal?: AbortSignal) =>
    request<MeDto>('/auth/me', { schema: MeDto, signal }),

  updateMyName: (input: z.infer<typeof UpdateMyNameDto>) =>
    request<MeDto>('/users/me', {
      method: 'PATCH',
      body: UpdateMyNameDto.parse(input),
      schema: MeDto,
    }),
};
