/**
 * Role-Based Access Control (RBAC) & JWT Security Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements strict role evaluation mapping to SVRD_ALLOWED_ROLES from
 * the SERVICE_DETAILS database table and JWT session expiry management.
 */

/**
 * Safely decodes a JWT payload without external libraries.
 * @param {string} token - Raw JWT string
 * @returns {object|null} Decoded payload or null
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("[RBAC] Failed to parse JWT:", e);
    return null;
  }
}

/**
 * Checks if a JWT token has expired.
 * Includes a 5-second buffer to prevent edge-of-expiry race conditions.
 *
 * @param {string} token
 * @returns {boolean} True if expired or invalid
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false; // If no exp claim, consider valid

  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= payload.exp - 5;
}

/**
 * Gets milliseconds remaining until token expiration.
 * @param {string} token
 * @returns {number} Remaining ms or 0 if expired
 */
export function getTokenRemainingMs(token) {
  if (!token) return 0;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return 3600 * 1000; // Default 1 hour fallback
  const diffMs = payload.exp * 1000 - Date.now();
  return Math.max(0, diffMs);
}

/**
 * Normalizes a user's role list into a standardized Set of uppercase role names,
 * expanding both 'ROLE_MAKER' and 'MAKER' representations for robust matching.
 *
 * @param {string|string[]} roles
 * @returns {Set<string>}
 */
export function normalizeUserRoles(roles) {
  const roleSet = new Set();
  if (!roles) return roleSet;

  const rawList = Array.isArray(roles)
    ? roles
    : String(roles)
        .split(",")
        .map((r) => r.trim());

  for (const r of rawList) {
    if (!r) continue;
    const clean = r.trim().toUpperCase();
    roleSet.add(clean);

    // Add dual forms: with and without ROLE_ prefix
    if (clean.startsWith("ROLE_")) {
      roleSet.add(clean.replace(/^ROLE_/, ""));
    } else {
      roleSet.add(`ROLE_${clean}`);
    }
  }

  return roleSet;
}

/**
 * Evaluates whether a user's roles satisfy SVRD_ALLOWED_ROLES.
 *
 * @param {string|string[]} userRoles - Current user's assigned roles
 * @param {string} allowedRolesStr - Comma-separated list from SVRD_ALLOWED_ROLES (e.g. "ADMIN,MAKER")
 * @returns {boolean} True if authorized
 */
export function isRoleAuthorized(userRoles, allowedRolesStr) {
  // If no allowed roles constraint is specified or it is wildcard, access is granted
  if (!allowedRolesStr || allowedRolesStr.trim() === "" || allowedRolesStr.trim() === "*") {
    return true;
  }

  const userRoleSet = normalizeUserRoles(userRoles);
  if (userRoleSet.size === 0) return false;

  // Super-admin bypass: ADMIN or ROLE_ADMIN has universal access
  if (userRoleSet.has("ADMIN") || userRoleSet.has("ROLE_ADMIN")) {
    return true;
  }

  const allowedList = String(allowedRolesStr)
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  for (const allowed of allowedList) {
    const rawName = allowed.replace(/^ROLE_/, "");
    const rolePrefixed = `ROLE_${rawName}`;

    if (userRoleSet.has(allowed) || userRoleSet.has(rawName) || userRoleSet.has(rolePrefixed)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a hierarchical list of services and sub-services based on SVRD_ALLOWED_ROLES.
 * Only returns services that have at least one authorized sub-service.
 *
 * @param {Array} services - Array of service categories with children
 * @param {string|string[]} userRoles - Current user roles
 * @returns {Array} Filtered services with only authorized children
 */
export function filterServicesByRole(services, userRoles) {
  if (!Array.isArray(services)) return [];

  return services
    .map((service) => {
      // Check service category allowedRoles (if defined)
      const serviceAllowed = isRoleAuthorized(
        userRoles,
        service.allowedRoles || service.svrdAllowedRoles
      );
      if (!serviceAllowed) return null;

      // Filter sub-services
      const authorizedChildren = (service.children || []).filter((child) => {
        const childAllowedRoles =
          child.allowedRoles ||
          child.svrdAllowedRoles ||
          child.SVRD_ALLOWED_ROLES;
        return isRoleAuthorized(userRoles, childAllowedRoles);
      });

      // If the service has no authorized children, omit it from the menu
      if (authorizedChildren.length === 0 && (service.children || []).length > 0) {
        return null;
      }

      return {
        ...service,
        children: authorizedChildren,
      };
    })
    .filter(Boolean);
}

/**
 * Recursively filters an arbitrary-depth menu tree against SVRD_ALLOWED_ROLES.
 * Handles parent folders, child sub-menus, and nested leaf items.
 *
 * @param {Array} nodes - Array of MenuNodeDto nodes
 * @param {string|string[]} userRoles - Current user roles
 * @returns {Array} Filtered tree with only authorized nodes preserved
 */
export function filterMenuTreeRecursive(nodes, userRoles) {
  if (!Array.isArray(nodes)) {
    if (nodes && typeof nodes === "object") {
      nodes = [nodes];
    } else {
      return [];
    }
  }

  return nodes
    .map((node) => {
      const allowedRoles =
        node.allowedRoles || node.svrdAllowedRoles || node.SVRD_ALLOWED_ROLES;
      const isSelfAuthorized = isRoleAuthorized(userRoles, allowedRoles);

      // Recursively filter children
      const filteredChildren = Array.isArray(node.children) && node.children.length > 0
        ? filterMenuTreeRecursive(node.children, userRoles)
        : [];

      // A node is kept if:
      // 1. It is authorized AND (is a leaf or has authorized children)
      // 2. OR it is a container with at least one authorized child
      if (filteredChildren.length > 0 && isSelfAuthorized) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      if (isSelfAuthorized) {
        return {
          ...node,
          children: [],
        };
      }

      return null;
    })
    .filter(Boolean);
}
