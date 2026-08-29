import { useAuthStore } from '../store/useAuthStore';

const PERMISSIONS: Record<string, string[]> = {
  'create:student': ['super_admin', 'center_admin', 'staff'],
  'edit:student': ['super_admin', 'center_admin', 'staff'],
  'deactivate:student': ['super_admin', 'center_admin'],
  'mark:attendance': ['teacher', 'volunteer'],
  'edit:attendance': ['super_admin', 'center_admin', 'teacher'],
  'create:exam': ['super_admin', 'center_admin', 'teacher'],
  'enter:scores': ['super_admin', 'center_admin', 'teacher'],
  'create:form': ['super_admin', 'center_admin', 'teacher'],
  // Anyone who runs a center day-to-day can plan an activity — not just admins.
  'create:activity': ['super_admin', 'tech_admin', 'center_admin', 'supervisor', 'teacher', 'staff'],
  'create:announcement': ['super_admin', 'center_admin'],
  'define:skillCategory': ['super_admin'],
  'log:skill': ['super_admin', 'center_admin', 'teacher']
};

export function usePermission() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const myRoles = currentUser?.roles?.length ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []);

  return {
    can: (action: string, resource: string) => {
      if (!myRoles.length) return false;
      const allowedRoles = PERMISSIONS[`${action}:${resource}`];
      return !!allowedRoles && myRoles.some((r) => allowedRoles.includes(r));
    }
  };
}
