import React from 'react';
import UpcomingVaccinationsList from '../UpcomingVaccinationsList';

export default function VaccinationsTab() {
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
