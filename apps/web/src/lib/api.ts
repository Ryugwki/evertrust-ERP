import { z } from 'zod';
import {
  AssignmentDto,
  AssignTenderDto,
  CreateCustomerDto,
  CreateSupplierDto,
  CreateTenderDto,
  CustomerDto,
  DocumentDto,
  HealthDto,
  ListTendersQuery,
  LoginDto,
  LoginResponseDto,
  MeDto,
  SupplierDto,
  TenderDto,
  TransitionTenderDto,
  UpdateCustomerDto,
  UpdateMyNameDto,
  UpdateSupplierDto,
  UpdateTenderDto,
  UploadDocumentDto,
  UserListItemDto,
} from '@evertrust/shared';
import { API_URL } from './env';

// List responses validated as arrays of the element schema, so a single drifted
// row fails the whole list loud instead of rendering undefined down the page.
const TenderListDto = z.array(TenderDto);
const SupplierListDto = z.array(SupplierDto);
const CustomerListDto = z.array(CustomerDto);
const UserListDto = z.array(UserListItemDto);
const DocumentListDto = z.array(DocumentDto);
// GET /tenders/:id/assignment returns the ACTIVE assignment or null.
const AssignmentOrNullDto = AssignmentDto.nullable();

// Build a `?status=...` query string from the (optional) typed list filter. Kept
// tiny and explicit; only adds keys that are set.
function tendersQuery(query?: z.infer<typeof ListTendersQuery>): string {
  if (!query?.status) return '';
  const params = new URLSearchParams({ status: query.status });
  return `?${params.toString()}`;
}

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

// Multipart POST for file uploads. Distinct from request() because the body is a
// FormData (the browser sets the multipart Content-Type + boundary itself — we
// must NOT set it). Still credentials:'include' (cookie auth) and still validates
// the JSON response against the shared contract.
async function uploadRequest<T>(
  path: string,
  form: FormData,
  schema: z.ZodTypeAny,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new ApiError(0, 'Network error: could not reach the API.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
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

  // ---- Users (org directory for pickers) ----
  users: {
    list: (signal?: AbortSignal) =>
      request<UserListItemDto[]>('/users', { schema: UserListDto, signal }),
  },

  // ---- Tenders ----
  tenders: {
    list: (query?: z.infer<typeof ListTendersQuery>, signal?: AbortSignal) =>
      request<TenderDto[]>(`/tenders${tendersQuery(query)}`, {
        schema: TenderListDto,
        signal,
      }),

    get: (id: string, signal?: AbortSignal) =>
      request<TenderDto>(`/tenders/${id}`, { schema: TenderDto, signal }),

    create: (input: z.infer<typeof CreateTenderDto>) =>
      request<TenderDto>('/tenders', {
        method: 'POST',
        body: CreateTenderDto.parse(input),
        schema: TenderDto,
      }),

    update: (id: string, input: z.infer<typeof UpdateTenderDto>) =>
      request<TenderDto>(`/tenders/${id}`, {
        method: 'PATCH',
        body: UpdateTenderDto.parse(input),
        schema: TenderDto,
      }),

    transition: (id: string, input: z.infer<typeof TransitionTenderDto>) =>
      request<TenderDto>(`/tenders/${id}/transition`, {
        method: 'POST',
        body: TransitionTenderDto.parse(input),
        schema: TenderDto,
      }),

    // ---- Phase 4: assignment ----
    getAssignment: (id: string, signal?: AbortSignal) =>
      request<AssignmentDto | null>(`/tenders/${id}/assignment`, {
        schema: AssignmentOrNullDto,
        signal,
      }),

    assign: (id: string, input: z.infer<typeof AssignTenderDto>) =>
      request<AssignmentDto>(`/tenders/${id}/assign`, {
        method: 'POST',
        body: AssignTenderDto.parse(input),
        schema: AssignmentDto,
      }),

    // ---- Phase 4: TYPE 1 documents ----
    listDocuments: (id: string, signal?: AbortSignal) =>
      request<DocumentDto[]>(`/tenders/${id}/documents`, {
        schema: DocumentListDto,
        signal,
      }),

    uploadDocument: (
      id: string,
      file: File,
      input: z.infer<typeof UploadDocumentDto>,
    ) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', input.type);
      if (input.kind) form.append('kind', input.kind);
      return uploadRequest<DocumentDto>(
        `/tenders/${id}/documents`,
        form,
        DocumentDto,
      );
    },
  },

  // ---- Documents (binary download) ----
  documents: {
    // The browser navigates/links straight to this URL; the httpOnly auth cookie
    // rides along (same-site) so no Authorization header is needed.
    downloadUrl: (id: string) => `${API_URL}/documents/${id}/download`,
  },

  // ---- Suppliers ----
  suppliers: {
    list: (signal?: AbortSignal) =>
      request<SupplierDto[]>('/suppliers', { schema: SupplierListDto, signal }),

    get: (id: string, signal?: AbortSignal) =>
      request<SupplierDto>(`/suppliers/${id}`, { schema: SupplierDto, signal }),

    create: (input: z.infer<typeof CreateSupplierDto>) =>
      request<SupplierDto>('/suppliers', {
        method: 'POST',
        body: CreateSupplierDto.parse(input),
        schema: SupplierDto,
      }),

    update: (id: string, input: z.infer<typeof UpdateSupplierDto>) =>
      request<SupplierDto>(`/suppliers/${id}`, {
        method: 'PATCH',
        body: UpdateSupplierDto.parse(input),
        schema: SupplierDto,
      }),
  },

  // ---- Customers ----
  customers: {
    list: (signal?: AbortSignal) =>
      request<CustomerDto[]>('/customers', { schema: CustomerListDto, signal }),

    get: (id: string, signal?: AbortSignal) =>
      request<CustomerDto>(`/customers/${id}`, { schema: CustomerDto, signal }),

    create: (input: z.infer<typeof CreateCustomerDto>) =>
      request<CustomerDto>('/customers', {
        method: 'POST',
        body: CreateCustomerDto.parse(input),
        schema: CustomerDto,
      }),

    update: (id: string, input: z.infer<typeof UpdateCustomerDto>) =>
      request<CustomerDto>(`/customers/${id}`, {
        method: 'PATCH',
        body: UpdateCustomerDto.parse(input),
        schema: CustomerDto,
      }),
  },
};
