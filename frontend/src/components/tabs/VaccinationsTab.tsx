import React from 'react';
import { useGetCallerUserProfile } from '../../hooks/useQueries';
import UpcomingVaccinationsList from '../UpcomingVaccinationsList';
import VetVaccinationsTab from './VetVaccinationsTab';

export default function VaccinationsTab() {
  const { data: userProfile } = useGetCallerUserProfile();
  const isVet = userProfile?.role === 'VET';

  if (isVet) {
    return <VetVaccinationsTab />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Vaccination Reminders</h3>
        <p className="text-muted-foreground">Keep track of all upcoming vaccinations for your pets</p>
      </div>
      <UpcomingVaccinationsList />
    </div>
  );
}
