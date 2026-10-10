/**
 * AIRPULSE — Campus Support Controller (Feature 14)
 */

import * as campusService from '../services/campusService.js';

export async function listCampuses(req, res, next) {
  try {
    const campuses = await campusService.listCampuses();
    res.json({
      status: 'success',
      count: campuses.length,
      data: campuses,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCampus(req, res, next) {
  try {
    const campus = await campusService.getCampus(req.params.id);
    if (!campus) {
      return res.status(404).json({
        status: 'error',
        error: { message: `Campus institution ${req.params.id} not found.` },
      });
    }
    res.json({
      status: 'success',
      data: campus,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEnvironmentalStatus(req, res, next) {
  try {
    const status = await campusService.getCampusEnvironmentalStatus(req.params.id, {
      mode: req.query.mode,
      date: req.query.date,
      model: req.query.model,
    });
    res.json({
      status: 'success',
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPolicies(req, res, next) {
  try {
    const policies = await campusService.getCampusPolicies(req.params.id);
    res.json({
      status: 'success',
      count: policies.length,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePolicy(req, res, next) {
  try {
    const updated = await campusService.updateCampusPolicy(
      req.params.id,
      req.params.policyId,
      req.body,
      req.campusAuth
    );
    res.json({
      status: 'success',
      message: 'Institutional policy rule updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function evaluatePolicy(req, res, next) {
  try {
    const evaluation = await campusService.evaluateCampusPolicy(
      req.params.id,
      {
        mode: req.body?.mode || req.query?.mode,
        date: req.body?.date || req.query?.date,
        model: req.body?.model || req.query?.model,
        pollutant: req.body?.pollutant || req.query?.pollutant,
        value: req.body?.value !== undefined ? req.body.value : req.query?.value,
      },
      req.campusAuth
    );
    res.json({
      status: 'success',
      data: evaluation,
    });
  } catch (err) {
    next(err);
  }
}

export async function listNotices(req, res, next) {
  try {
    const role = req.campusAuth?.role || 'general_user';
    const notices = await campusService.listNotices(req.params.id, role);
    res.json({
      status: 'success',
      count: notices.length,
      data: notices,
    });
  } catch (err) {
    next(err);
  }
}

export async function createNotice(req, res, next) {
  try {
    const notice = await campusService.createNotice(req.params.id, req.body, req.campusAuth);
    res.status(201).json({
      status: 'success',
      message: 'Campus notice draft created successfully.',
      data: notice,
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewNotice(req, res, next) {
  try {
    const notice = await campusService.reviewNotice(
      req.params.id,
      req.params.noticeId,
      req.body,
      req.campusAuth
    );
    res.json({
      status: 'success',
      message: 'Notice moved to review stage.',
      data: notice,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveNotice(req, res, next) {
  try {
    const notice = await campusService.approveNotice(
      req.params.id,
      req.params.noticeId,
      req.body,
      req.campusAuth
    );
    res.json({
      status: 'success',
      message: 'Notice approved for institutional distribution.',
      data: notice,
    });
  } catch (err) {
    next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const role = req.campusAuth?.role || 'general_user';
    const students = await campusService.listStudentProfiles(req.params.id, role);
    res.json({
      status: 'success',
      count: students.length,
      data: students,
    });
  } catch (err) {
    next(err);
  }
}

export async function registerStudent(req, res, next) {
  try {
    const profile = await campusService.registerStudentProfile(req.params.id, req.body, req.campusAuth);
    res.status(201).json({
      status: 'success',
      message: 'Voluntary student support profile registered with consent.',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}

export async function withdrawConsent(req, res, next) {
  try {
    const result = await campusService.withdrawStudentConsent(
      req.params.id,
      req.params.studentId,
      req.campusAuth
    );
    res.json({
      ...result,
      data: result.profile || result,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAccommodations(req, res, next) {
  try {
    const role = req.campusAuth?.role || 'general_user';
    const studentIdHash = req.campusAuth?.userId;
    const accommodations = await campusService.listAccommodations(req.params.id, role, studentIdHash);
    res.json({
      status: 'success',
      count: accommodations.length,
      data: accommodations,
    });
  } catch (err) {
    next(err);
  }
}

export async function createAccommodation(req, res, next) {
  try {
    const acc = await campusService.createAccommodationRequest(req.params.id, req.body, req.campusAuth);
    res.status(201).json({
      status: 'success',
      message: 'Academic accommodation request submitted for review.',
      data: acc,
    });
  } catch (err) {
    next(err);
  }
}

export async function decideAccommodation(req, res, next) {
  try {
    const decided = await campusService.decideAccommodation(
      req.params.id,
      req.params.accId,
      req.body,
      req.campusAuth
    );
    res.json({
      status: 'success',
      message: `Accommodation request ${decided.status}.`,
      data: decided,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const role = req.campusAuth?.role || 'general_user';
    const logs = await campusService.getAuditLogs(req.params.id, role);
    res.json({
      status: 'success',
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCatalog(req, res, next) {
  try {
    const catalog = campusService.getCatalogMetadata();
    res.json(catalog);
  } catch (err) {
    next(err);
  }
}
