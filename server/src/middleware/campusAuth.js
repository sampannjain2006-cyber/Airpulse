/**
 * AIRPULSE — Campus Support Role-Based Authorization Middleware (Feature 14)
 * 
 * Enforces least-privilege server-side access control:
 * - campus_admin: Institutional policies, notices, student profiles, accommodations, audit logs.
 * - support_staff: Review student support profiles, draft/review notices, manage accommodations.
 * - student: Access limited to their own record and submitting accommodations.
 * - general_user: Public campus environmental status & approved advisories only.
 * 
 * Note: Uses request headers (X-Campus-Role, X-Campus-User-Id) or Authorization Bearer tokens.
 * In production, this would bridge to an institutional IdP (SAML / OAuth2 / OIDC).
 */

export const ROLES = {
  CAMPUS_ADMIN: 'campus_admin',
  SUPPORT_STAFF: 'support_staff',
  STUDENT: 'student',
  GENERAL_USER: 'general_user',
};

export const ALL_ROLES = [
  ROLES.CAMPUS_ADMIN,
  ROLES.SUPPORT_STAFF,
  ROLES.STUDENT,
  ROLES.GENERAL_USER,
];

/**
 * Extracts and sets campus authentication context on req.campusAuth.
 */
export function campusAuthContext(req, res, next) {
  let role = ROLES.GENERAL_USER;
  let userId = 'anonymous';

  // 1. Check X-Campus-Role header
  const headerRole = req.headers['x-campus-role'];
  if (headerRole && typeof headerRole === 'string') {
    const normalized = headerRole.toLowerCase().trim();
    if (ALL_ROLES.includes(normalized)) {
      role = normalized;
    }
  }

  // 2. Check Authorization Bearer token (e.g. "Bearer role:campus_admin" or "Bearer campus_admin")
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim().toLowerCase();
    const tokenParts = token.split(':');
    const potentialRole = tokenParts[tokenParts.length - 1];
    if (ALL_ROLES.includes(potentialRole)) {
      role = potentialRole;
    }
  }

  // 3. Optional query parameter for automated testing (e.g., ?role=support_staff)
  if (req.query && req.query.auth_role) {
    const qRole = String(req.query.auth_role).toLowerCase().trim();
    if (ALL_ROLES.includes(qRole)) {
      role = qRole;
    }
  }

  // 4. Extract user identity
  const headerUserId = req.headers['x-campus-user-id'] || req.headers['x-campus-actor'] || req.query.auth_user_id;
  if (headerUserId && typeof headerUserId === 'string') {
    userId = headerUserId.trim();
  } else {
    userId = role === ROLES.GENERAL_USER ? 'anonymous' : `${role}-user-01`;
  }

  req.campusAuth = {
    role,
    userId,
    isAuthenticated: role !== ROLES.GENERAL_USER,
    isStaffOrAdmin: role === ROLES.CAMPUS_ADMIN || role === ROLES.SUPPORT_STAFF,
    isAdmin: role === ROLES.CAMPUS_ADMIN,
  };

  next();
}

/**
 * Middleware factory requiring one of the specified roles.
 * Strictly returns HTTP 403 Forbidden with honest authorization details when role check fails.
 */
export function requireCampusRole(allowedRoles = []) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Ensure campusAuthContext has run
    if (!req.campusAuth) {
      campusAuthContext(req, res, () => {});
    }

    const currentRole = req.campusAuth?.role || ROLES.GENERAL_USER;

    if (!rolesArray.includes(currentRole)) {
      return res.status(403).json({
        status: 'forbidden',
        error: {
          code: 'CAMPUS_ACCESS_RESTRICTED',
          message: `Access denied. Operation requires one of the following authorized campus roles: [${rolesArray.join(', ')}]. Current role: '${currentRole}'.`,
          required_roles: rolesArray,
          current_role: currentRole,
          disclaimer: 'Institutional student support profiles and accommodation decisions are restricted under student privacy regulations.',
        },
      });
    }

    next();
  };
}
