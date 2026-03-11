/**
 * Adapter: converte handlers no estilo Pages API (req, res) para App Router (Request => Response).
 * Permite reutilizar handlers existentes em app/api/ sem reescrevê-los.
 * Suporta respostas JSON e streaming (ex: PDF via doc.pipe(res)).
 */
/* eslint-disable no-unused-vars -- tipos de interface usados por handlers externos */

import { Writable } from "node:stream";
import { NextResponse } from "next/server";

type PagesReq = {
  method: string;
  url: string;
  query: Record<string, string>;
  body: unknown;
};

interface PagesRes {
  _headersSent: boolean;
  headersSent: boolean;
  status(code: number): PagesRes;
  json(data: unknown): void;
  setHeader(name: string, value: string): void;
  end(chunk?: unknown, enc?: unknown, cb?: () => void): PagesRes;
}

type PagesHandler = (req: PagesReq, res: PagesRes) => Promise<void>;

type RouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

/**
 * @param pagesHandler - Handler no formato Pages (req, res)
 * @param opts - Opções
 * @returns Route handler para App Router
 */
export function withPagesHandler(
  pagesHandler: PagesHandler,
  opts: { params?: Record<string, string> } = {}
) {
  const { params: staticParams = {} } = opts;

  return async function routeHandler(
    request: Request,
    context?: RouteContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());

    let params: Record<string, string> = staticParams;
    if (context?.params) {
      params =
        typeof (context.params as Promise<Record<string, string>>).then ===
        "function"
          ? await (context.params as Promise<Record<string, string>>)
          : (context.params as Record<string, string>);
    }
    const mergedQuery = { ...query, ...params };

    let statusCode = 200;
    let jsonBody: unknown = null;
    const headers: Record<string, string> = {};
    const streamChunks: Buffer[] = [];

    const writable = new Writable({
      write(chunk: Buffer | string, _enc, cb) {
        streamChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
      final(cb) {
        cb();
      },
    });

    const req: PagesReq = {
      method: request.method,
      url: request.url,
      query: mergedQuery,
      body: {},
    };

    const originalEnd = writable.end.bind(writable);
    const res = Object.assign(writable, {
      _headersSent: false,
      get headersSent() {
        return (this as { _headersSent: boolean })._headersSent;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        if (!(this as { _headersSent: boolean })._headersSent) {
          (this as { _headersSent: boolean })._headersSent = true;
          jsonBody = data;
        }
      },
      setHeader(name: string, value: string) {
        headers[name] = String(value);
      },
      end(
        chunk?: unknown,
        enc?: unknown,
        cb?: () => void
      ): typeof res {
        if (typeof chunk === "function") {
          cb = chunk as () => void;
          chunk = undefined;
        } else if (typeof enc === "function") {
          cb = enc as () => void;
          enc = undefined;
        }
        if (!(this as { _headersSent: boolean })._headersSent) {
          (this as { _headersSent: boolean })._headersSent = true;
        }
        return originalEnd(chunk, enc, cb) as typeof res;
      },
    }) as unknown as PagesRes;

    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          req.body = await request.json();
        } catch {
          req.body = {};
        }
      }

      await pagesHandler(req, res);

      const contentType = (
        headers["content-type"] || headers["Content-Type"] || ""
      ).toLowerCase();
      if (contentType.includes("application/pdf")) {
        await new Promise<void>((resolve, reject) => {
          if (writable.writableFinished) return resolve();
          writable.once("finish", () => resolve());
          writable.once("error", reject);
        });
        if (!(res as { _headersSent: boolean })._headersSent) {
          (res as { _headersSent: boolean })._headersSent = true;
        }
      }

      if (!(res as { _headersSent: boolean })._headersSent) {
        return NextResponse.json(
          { error: "Handler did not send response" },
          { status: 500 }
        );
      }

      const responseOptions: { status: number; headers?: Record<string, string> } = {
        status: statusCode,
      };
      if (Object.keys(headers).length) {
        responseOptions.headers = headers;
      }

      if (streamChunks.length > 0) {
        const buffer = Buffer.concat(streamChunks);
        return new Response(buffer, responseOptions);
      }

      return NextResponse.json(jsonBody, responseOptions);
    } catch (err) {
      console.error("[withPagesHandler] Unexpected error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
