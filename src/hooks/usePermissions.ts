import { useQuery } from '@tanstack/react-query';
import { useBranchContext } from '../context/BranchContext';
import client from '../api/client';

export const usePermissions = () => {
  const { selectedBranchId } = useBranchContext();

  // We could fetch the current user's role for the selected branch
  const { data: userProfile } = useQuery({
    queryKey: ['me', selectedBranchId],
    queryFn: async () => {
      // Assuming there's a /auth/me endpoint that returns user + branch roles
      const response = await client.get('/auth/me');
      return response.data;
    },
    enabled: !!localStorage.getItem('token'),
  });

  const hasPermission = (permission: string) => {
    if (!userProfile) return false;
    
    const branchRole = userProfile.userBranchRoles?.find(
      (ubr: any) => ubr.branchId === selectedBranchId
    );

    if (!branchRole) return false;
    
    if (branchRole.role.name === 'Admin') return true;

    return branchRole.role.permissions.some((p: any) => p.name === permission);
  };

  return { hasPermission, userProfile };
};
