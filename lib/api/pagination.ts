import type { NextRequest } from "next/server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface Page {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

// Returns null when the request carries no `?page` — callers then fall back to
// the pre-pagination behaviour (return the whole list), keeping form-selector
// and PDF consumers of the same endpoint working unchanged.
export function parsePage(request: NextRequest): Page | null {
  const { searchParams } = new URL(request.url);
  if (!searchParams.has("page")) return null;

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function pageResponse<T>(rows: T[], total: number, page: Page) {
  return {
    rows,
    total,
    page: page.page,
    pageSize: page.pageSize,
    pageCount: Math.max(1, Math.ceil(total / page.pageSize)),
  };
}

// Route helper for the common "list + count" endpoint: returns the bare array
// when the request carries no `?page` (unchanged for form-selector / PDF
// consumers), otherwise a { rows, total, pageCount, ... } envelope.
export async function paginate<T>(
  request: NextRequest,
  list: (page?: Page) => Promise<T[]>,
  count: () => Promise<number>
) {
  const page = parsePage(request);
  if (!page) return list();
  const [rows, total] = await Promise.all([list(page), count()]);
  return pageResponse(rows, total, page);
}
