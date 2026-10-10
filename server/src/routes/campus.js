/**
 * AIRPULSE — Campus Support Routes (Feature 14)
 */

import { Router } from 'express';
import * as campusController from '../controllers/campusController.js';
import { campusAuthContext, requireCampusRole, ROLES } from '../middleware/campusAuth.js';

export const campusRouter = Router();

// Apply auth context parsing to all campus routes
campusRouter.use(campusAuthContext);

// 1. Public Metadata & Institution Registry
campusRouter.get('/catalog', campusController.getCatalog);
campusRouter.get('/institutions', campusController.listCampuses);
campusRouter.get('/institutions/:id', campusController.getCampus);

// 2. Campus Environmental Status (Public / Campus Community)
campusRouter.get('/:id/environmental-status', campusController.getEnvironmentalStatus);

// 3. Response Policies
campusRouter.get('/:id/policies', campusController.getPolicies);
campusRouter.put(
  '/:id/policies/:policyId',
  requireCampusRole([ROLES.CAMPUS_ADMIN]),
  campusController.updatePolicy
);

// 4. Policy Evaluation Workflow (Staff / Admin Decision Support)
campusRouter.post(
  '/:id/evaluate-policy',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.evaluatePolicy
);

// 5. Campus Notices (Draft, Review & Approval)
campusRouter.get('/:id/notices', campusController.listNotices);
campusRouter.post(
  '/:id/notices',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.createNotice
);
campusRouter.post(
  '/:id/notices/:noticeId/review',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.reviewNotice
);
campusRouter.post(
  '/:id/notices/:noticeId/approve',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.approveNotice
);
campusRouter.patch(
  '/:id/notices/:noticeId/approve',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.approveNotice
);

// 6. Student Support Profiles (RESTRICTED PRIVACY — Blocked for General Users & Other Students)
campusRouter.get(
  '/:id/students',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.listStudents
);
campusRouter.post(
  '/:id/students',
  campusController.registerStudent
);
campusRouter.post(
  '/:id/students/:studentId/withdraw-consent',
  campusController.withdrawConsent
);
campusRouter.patch(
  '/:id/students/:studentId/withdraw-consent',
  campusController.withdrawConsent
);

// 7. Academic Accommodations Workflow
campusRouter.get(
  '/:id/accommodations',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF, ROLES.STUDENT]),
  campusController.listAccommodations
);
campusRouter.post(
  '/:id/accommodations',
  campusController.createAccommodation
);
campusRouter.post(
  '/:id/accommodations/:accId/decide',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.decideAccommodation
);
campusRouter.patch(
  '/:id/accommodations/:accId/decide',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.decideAccommodation
);
campusRouter.post(
  '/:id/accommodations/:accId/decision',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.decideAccommodation
);
campusRouter.patch(
  '/:id/accommodations/:accId/decision',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.decideAccommodation
);

// 8. Institutional Audit Logs (Staff / Admin only)
campusRouter.get(
  '/:id/audit-logs',
  requireCampusRole([ROLES.CAMPUS_ADMIN, ROLES.SUPPORT_STAFF]),
  campusController.getAuditLogs
);
