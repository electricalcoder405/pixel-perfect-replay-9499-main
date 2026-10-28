import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "@/app/navigation";
import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
function matchedRouteId(path: string) {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
  return router.matchRoutes(path).at(-1)?.routeId;
}

describe("App routing", () => {
  it("matches the landing page for /", () => {
    expect(matchedRouteId("/")).toBe("/");
  });

  it("matches the dashboard overview for /dashboard", () => {
    expect(matchedRouteId("/dashboard")).toBe("/dashboard/");
  });

  it.each(NAV_ITEMS.filter((item) => item.to !== "/dashboard").map((item) => [item.to]))(
    "matches %s instead of falling back to not found",
    (path) => {
      const id = matchedRouteId(path);
      expect(id).toBe(path);
      expect(id).not.toBe(rootRouteId);
    },
  );
});
