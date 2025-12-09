/**
 * Contentstack Management API utilities
 * Used for creating stacks and sharing them with users
 */

const BASE_URL = 'https://api.contentstack.io/v3';

interface CreateStackResponse {
  stack: {
    uid: string;
    name: string;
    api_key: string;
  };
}

interface Role {
  uid: string;
  name: string;
  description?: string;
}

interface GetRolesResponse {
  roles: Role[];
}

interface ShareStackResponse {
  notice: string;
  emails: string[];
}

/**
 * Create a new stack in Contentstack organization
 */
export async function createStack(
  stackName: string,
  orgUid: string,
  authToken: string
): Promise<CreateStackResponse> {
  const url = `${BASE_URL}/stacks`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authtoken': authToken,
      'organization_uid': orgUid, // Add org_uid to headers as well
    },
    body: JSON.stringify({
      stack: {
        name: stackName,
        description: `Playground stack for ${stackName}`,
        master_locale: 'en-us',
      },
      org_uid: orgUid, // Also include in body
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create stack: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

/**
 * Get all roles from a Contentstack stack
 * Note: Newly created stacks may not have roles yet, so we try stack roles first,
 * then fall back to organization-level roles if needed
 */
export async function getAllRoles(
  stackUid: string,
  stackApiKey: string,
  authToken: string,
  orgUid: string
): Promise<Role[]> {
  // First, try to get roles from the stack
  const stackRolesUrl = `${BASE_URL}/stacks/${stackUid}/roles`;
  
  try {
    const stackResponse = await fetch(stackRolesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'api_key': stackApiKey,
      },
    });

    if (stackResponse.ok) {
      const stackData: GetRolesResponse = await stackResponse.json();
      if (stackData.roles && stackData.roles.length > 0) {
        console.log(`Found ${stackData.roles.length} roles in stack`);
        return stackData.roles;
      }
    }
  } catch (error: any) {
    console.warn(`Failed to get stack roles: ${error.message}`);
  }

  // If stack doesn't have roles yet, try organization-level roles
  console.log('Stack has no roles yet, trying organization-level roles...');
  const orgRolesUrl = `${BASE_URL}/roles?org_uid=${orgUid}`;
  
  const orgResponse = await fetch(orgRolesUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'authtoken': authToken,
      'organization_uid': orgUid,
    },
  });

  if (!orgResponse.ok) {
    const errorData = await orgResponse.json().catch(() => ({}));
    // If org roles also fail, return empty array and let the caller handle it
    console.warn(`Failed to get organization roles: ${orgResponse.status} ${JSON.stringify(errorData)}`);
    return [];
  }

  const orgData: GetRolesResponse = await orgResponse.json();
  console.log(`Found ${orgData.roles?.length || 0} roles at organization level`);
  return orgData.roles || [];
}

/**
 * Find Admin role from roles list
 */
export function findAdminRole(roles: Role[]): Role | null {
  // Look for Admin role (case-insensitive)
  const adminRole = roles.find(
    (role) => role.name.toLowerCase() === 'admin'
  );
  
  if (!adminRole) {
    // If no exact match, try to find roles containing "admin"
    return roles.find(
      (role) => role.name.toLowerCase().includes('admin')
    ) || null;
  }
  
  return adminRole;
}

/**
 * Share a stack with users and assign roles
 * Note: roleUids can be empty array if no roles are available
 */
export async function shareStack(
  stackUid: string,
  stackApiKey: string,
  emails: string[],
  roleUids: string[],
  authToken: string
): Promise<ShareStackResponse> {
  const url = `${BASE_URL}/stacks/${stackUid}/share`;
  
  // Build request body - only include roles if provided
  const body: any = {
    emails: emails,
  };
  
  // Only add roles if we have any
  if (roleUids && roleUids.length > 0) {
    body.roles = roleUids;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authtoken': authToken,
      'api_key': stackApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to share stack: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

