import type { Role } from "./types";

export function getDemoRole(searchParams?: { role?: string }): Role {
  return searchParams?.role === "client" ? "client" : "trainer";
}

export function defaultRouteForRole(role: Role) {
  return role === "client" ? "/client/home" : "/trainer/dashboard";
}
