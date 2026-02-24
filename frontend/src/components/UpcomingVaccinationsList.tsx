import React from 'react';
import { useGetUpcomingVaccinations } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function UpcomingVaccinationsList() {
  const { data: vaccinations, isLoading } = useGetUpcomingVaccinations();

  const sortedVaccinations = vaccinations
    ? [...vaccinations].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    : [];

  const getUrgency = (date: string) => {
    const vaccDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((vaccDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 1) return 'critical';
    if (daysUntil <= 3) return 'urgent';
    if (daysUntil <= 7) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Vaccinations (Next 30 Days)</CardTitle>
        <CardDescription>Stay on top of your pet's health schedule</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : sortedVaccinations.length > 0 ? (
          sortedVaccinations.map((vacc) => {
            const urgency = getUrgency(vacc.scheduledDate);
            const daysUntil = Math.ceil(
              (new Date(vacc.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={vacc.id}
                className={`p-3 border rounded-lg ${getUrgencyColor(urgency)} space-y-2 flex items-start gap-3`}
              >
                {urgency !== 'normal' && (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{vacc.pet?.name}</span>
                    <span className="text-sm">- {vacc.vaccineName}</span>
                  </div>
                  <p className="text-sm">
                    {new Date(vacc.scheduledDate).toLocaleDateString()} at{' '}
                    {new Date(vacc.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {daysUntil <= 7 && (
                    <p className="text-sm font-medium mt-1">
                      {daysUntil === 0 && '🔴 Due today!'}
                      {daysUntil === 1 && '🟠 Due tomorrow!'}
                      {daysUntil > 1 && daysUntil <= 7 && `⚠️ Due in ${daysUntil} days`}
                    </p>
                  )}
                  {vacc.notes && (
                    <p className="text-sm opacity-75 mt-1">{vacc.notes}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground py-8">✓ No vaccinations due in the next 30 days</p>
        )}
      </CardContent>
    </Card>
  );
}
