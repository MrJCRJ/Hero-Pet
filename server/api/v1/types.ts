/* Minimal types for Pages-style API handlers (req, res) */

export interface ApiReqLike {
  method: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResLike {
  status: (code: number) => ApiResLike;
  json: (data: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (chunk?: unknown, enc?: unknown, cb?: () => void) => ApiResLike;
}
