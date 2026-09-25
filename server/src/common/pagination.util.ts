export interface Pagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Parse `?page=&limit=` query params into Prisma skip/take.
 * Defaults keep every existing client working (bounded lists, arrays as before).
 */
export function parsePagination(
  query: { page?: string | number; limit?: string | number },
  defaultLimit = 100,
  maxLimit = 500,
): Pagination {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? defaultLimit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
