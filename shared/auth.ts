export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'member';
  workspaceId: 'shared';
}
export interface AuthSession {
  user: AuthUser;
  csrfToken: string;
  expiresAt: number;
}
