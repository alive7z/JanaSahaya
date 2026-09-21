import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as userService from '../services/user.service.js';
import { getPriorityHistory } from '../services/priority.service.js';

export const citizenDashboard = asyncHandler(async (req, res) => {
  const data = await userService.getUserDashboard(req.user.id);
  success(res, 200, 'Dashboard fetched', data);
});

export const officerDashboard = asyncHandler(async (req, res) => {
  const data = await userService.officerDashboard(req.user.id);
  success(res, 200, 'Officer dashboard fetched', data);
});

export const adminDashboard = asyncHandler(async (req, res) => {
  const data = await userService.adminDashboard();
  success(res, 200, 'Admin dashboard fetched', data);
});

export const priorityAudit = asyncHandler(async (req, res) => {
  const history = await getPriorityHistory(req.params.id);
  success(res, 200, 'Priority history fetched', { history });
});