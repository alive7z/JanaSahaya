import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDashboard from './AdminDashboard';
import { adminIssues, adminOfficers } from '../services/admin';

vi.mock('../services/dashboard', () => ({
  adminDashboard: vi.fn().mockResolvedValue({ stats: {} }),
  analyticsOverview: vi.fn().mockResolvedValue({ daily: [], status: [], priority: [] }),
  analyticsDepartments: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/admin', () => ({
  adminListUsers: vi.fn(),
  adminAuditLogs: vi.fn(),
  adminSlaStatus: vi.fn(),
  adminDepartments: vi.fn(),
  adminCreateDepartment: vi.fn(),
  adminCategories: vi.fn(),
  adminCreateCategory: vi.fn(),
  adminCreateOfficer: vi.fn(),
  adminReports: vi.fn(),
  adminModerate: vi.fn(),
  adminIssues: vi.fn(),
  adminOfficers: vi.fn(),
  adminSlaRules: vi.fn(),
  adminUpdateSlaRule: vi.fn(),
  adminUpdateCategory: vi.fn(),
  adminIssuesReassign: vi.fn(),
  adminStatusOverride: vi.fn(),
  adminToggleBan: vi.fn(),
  adminMapIssues: vi.fn(),
}));

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    subscribe: () => () => {},
    joinMapRoom: () => {},
    leaveMapRoom: () => {},
  }),
}));

describe('AdminDashboard issues tab', () => {
  beforeEach(() => {
    adminIssues.mockResolvedValue({
      issues: [{
        id: 17,
        title: 'Broken street light',
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        category: 'Street Lighting',
        city: 'Dehradun',
        department: 'Electrical',
        reporter: 'Citizen Demo (3)',
        vote_count: 2,
      }],
      total: 1,
      page: 1,
      pages: 1,
      summary: { total: 1, open: 1, inProgress: 0, resolved: 0, submitted: 1 },
    });
    adminOfficers.mockResolvedValue([]);
  });

  it('opens and renders issues without blanking the dashboard', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /issues/i }));

    expect(await screen.findByText('Broken street light')).toBeInTheDocument();
    expect(screen.getByText('Electrical')).toBeInTheDocument();
    await waitFor(() => expect(adminIssues).toHaveBeenCalled());
  });
});
