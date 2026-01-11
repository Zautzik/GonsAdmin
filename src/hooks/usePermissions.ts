import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Permission = 
  | 'canCreateOT'
  | 'canEditOT'
  | 'canEditOwnOT'
  | 'canDeleteOT'
  | 'canUpdateActualCosts'
  | 'canViewCosts'
  | 'canViewAnalytics'
  | 'canManageUsers'
  | 'canManageConfig'
  | 'canViewAllOTs'
  | 'canApproveOT';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'canCreateOT',
    'canEditOT',
    'canEditOwnOT',
    'canDeleteOT',
    'canUpdateActualCosts',
    'canViewCosts',
    'canViewAnalytics',
    'canManageUsers',
    'canManageConfig',
    'canViewAllOTs',
    'canApproveOT',
  ],
  manager: [
    'canCreateOT',
    'canEditOT',
    'canEditOwnOT',
    'canViewCosts',
    'canViewAnalytics',
    'canViewAllOTs',
    'canApproveOT',
  ],
  supervisor: [
    'canCreateOT',
    'canEditOwnOT',
    'canUpdateActualCosts',
    'canViewCosts',
    'canViewAllOTs',
  ],
  technician: [
    'canUpdateActualCosts',
    'canViewAllOTs',
  ],
};

export function usePermissions() {
  const { role, user } = useAuth();

  const permissions = useMemo(() => {
    const userPermissions = role ? ROLE_PERMISSIONS[role] || [] : [];
    
    return {
      canCreateOT: userPermissions.includes('canCreateOT'),
      canEditOT: userPermissions.includes('canEditOT'),
      canEditOwnOT: userPermissions.includes('canEditOwnOT'),
      canDeleteOT: userPermissions.includes('canDeleteOT'),
      canUpdateActualCosts: userPermissions.includes('canUpdateActualCosts'),
      canViewCosts: userPermissions.includes('canViewCosts'),
      canViewAnalytics: userPermissions.includes('canViewAnalytics'),
      canManageUsers: userPermissions.includes('canManageUsers'),
      canManageConfig: userPermissions.includes('canManageConfig'),
      canViewAllOTs: userPermissions.includes('canViewAllOTs'),
      canApproveOT: userPermissions.includes('canApproveOT'),
      
      // Helper methods
      hasPermission: (permission: Permission) => userPermissions.includes(permission),
      hasAnyPermission: (perms: Permission[]) => perms.some(p => userPermissions.includes(p)),
      hasAllPermissions: (perms: Permission[]) => perms.every(p => userPermissions.includes(p)),
      
      // Check if user can edit a specific OT
      canEditSpecificOT: (createdBy: string | null) => {
        if (userPermissions.includes('canEditOT')) return true;
        if (userPermissions.includes('canEditOwnOT') && createdBy === user?.id) return true;
        return false;
      },
    };
  }, [role, user?.id]);

  return permissions;
}

export default usePermissions;
