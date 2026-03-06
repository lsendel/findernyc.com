export type RoleTemplate = {
  id: 'workspace_admin' | 'ops_manager' | 'analyst' | 'support_agent' | 'viewer';
  name: string;
  description: string;
  permissions: string[];
};

export type WorkspaceRoleAssignment = {
  workspace_id: string;
  member_id: string;
  role_id: RoleTemplate['id'];
  assigned_by?: string;
  assigned_at: string;
};

const templates: RoleTemplate[] = [
  {
    id: 'workspace_admin',
    name: 'Workspace Admin',
    description: 'Full workspace control including member management and portal configuration.',
    permissions: ['workspace.manage', 'members.manage', 'insights.read', 'portal.configure', 'webhook.manage'],
  },
  {
    id: 'ops_manager',
    name: 'Ops Manager',
    description: 'Operational access for follow-up automation and partner support workflows.',
    permissions: ['ops.manage', 'members.read', 'insights.read', 'automation.run'],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Read-only access to dashboards and insights drill-downs.',
    permissions: ['insights.read', 'dashboards.manage_own', 'members.read'],
  },
  {
    id: 'support_agent',
    name: 'Support Agent',
    description: 'Customer support access without configuration privileges.',
    permissions: ['tickets.manage', 'members.read', 'insights.read_limited'],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Least-privilege read-only access.',
    permissions: ['insights.read_limited'],
  },
];

const assignments = new Map<string, WorkspaceRoleAssignment>();

function key(workspace_id: string, member_id: string): string {
  return `${workspace_id.trim().toLowerCase()}::${member_id.trim().toLowerCase()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function listRoleTemplates(): RoleTemplate[] {
  return templates.map((template) => ({ ...template, permissions: [...template.permissions] }));
}

export function assignWorkspaceRole(input: {
  workspace_id: string;
  member_id: string;
  role_id: RoleTemplate['id'];
  assigned_by?: string;
}): { success: boolean; error?: string; assignment?: WorkspaceRoleAssignment } {
  const role = templates.find((template) => template.id === input.role_id);
  if (!role) return { success: false, error: 'role_not_found' };

  const assignment: WorkspaceRoleAssignment = {
    workspace_id: input.workspace_id.trim().toLowerCase(),
    member_id: input.member_id.trim().toLowerCase(),
    role_id: role.id,
    assigned_by: input.assigned_by?.trim() || undefined,
    assigned_at: nowIso(),
  };
  assignments.set(key(assignment.workspace_id, assignment.member_id), assignment);
  return { success: true, assignment };
}

export function listWorkspaceAssignments(workspace_id: string): WorkspaceRoleAssignment[] {
  const normalizedWorkspace = workspace_id.trim().toLowerCase();
  return Array.from(assignments.values())
    .filter((item) => item.workspace_id === normalizedWorkspace)
    .sort((a, b) => b.assigned_at.localeCompare(a.assigned_at));
}

export function __resetWorkspaceRolesForTests(): void {
  assignments.clear();
}
