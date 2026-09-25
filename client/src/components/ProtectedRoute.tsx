import React from 'react';
import { useApp } from '../context/AppContext';
import { InstructorPortal } from './client/InstructorPortal';
import { ClientPortal } from './client/ClientPortal';
import { ClientLoginPage } from './client/ClientLoginPage';

export const ProtectedPortalRoute: React.FC = () => {
  const { instructorUser, currentFamilyId } = useApp();

  if (instructorUser) {
    return <InstructorPortal />;
  }

  if (currentFamilyId) {
    return <ClientPortal />;
  }

  return <ClientLoginPage />;
};

export default ProtectedPortalRoute;
