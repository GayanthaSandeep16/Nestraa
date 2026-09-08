// Run: yarn tsx lib/api/pagination.check.ts
import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { pageResponse, parsePage } from "./pagination";

const req = (url: string) => ({ url } as NextRequest);

// No ?page -> null (callers fall back to returning the whole list)
assert.equal(parsePage(req("http://x/api/foo")), null);
assert.equal(parsePage(req("http://x/api/foo?pageSize=10")), null);

// page 1
assert.deepEqual(parsePage(req("http://x/api/foo?page=1")), {
  skip: 0,
  take: 50,
  page: 1,
  pageSize: 50,
});

// page 3, custom size
assert.deepEqual(parsePage(req("http://x/api/foo?page=3&pageSize=20")), {
  skip: 40,
  take: 20,
  page: 3,
  pageSize: 20,
});

// clamps: page floors at 1, pageSize is [1, 200], junk -> defaults
assert.equal(parsePage(req("http://x/api/foo?page=0"))!.page, 1);
assert.equal(parsePage(req("http://x/api/foo?page=-5"))!.skip, 0);
assert.equal(parsePage(req("http://x/api/foo?page=1&pageSize=9999"))!.take, 200);
assert.equal(parsePage(req("http://x/api/foo?page=1&pageSize=0"))!.take, 50);
assert.equal(parsePage(req("http://x/api/foo?page=abc"))!.page, 1);

// pageResponse
const page = parsePage(req("http://x/api/foo?page=2&pageSize=20"))!;
assert.deepEqual(pageResponse(["a", "b"], 45, page), {
  rows: ["a", "b"],
  total: 45,
  page: 2,
  pageSize: 20,
  pageCount: 3, // ceil(45 / 20)
});
// empty result set still reports at least one page
assert.equal(pageResponse([], 0, page).pageCount, 1);

console.log("pagination.check.ts OK");
