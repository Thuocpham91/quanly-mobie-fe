import React from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessRoute, getWorkScreen } from './permissions';

interface PermissionGuardProps {
  path: string;
  children: React.ReactNode;
  selectedBranchId?: string;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ path, children, selectedBranchId }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (canAccessRoute(path, selectedBranchId)) {
    return <>{children}</>;
  }

  const workScreen = getWorkScreen(selectedBranchId);
  return <Navigate to={workScreen} replace />;
};

export default PermissionGuard;
