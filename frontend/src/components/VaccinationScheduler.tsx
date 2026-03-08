import React, { useState } from 'react';
import { useGetPetVaccinations, useScheduleVaccination, useUpdateVaccinationStatus, useDeleteVaccination } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Check, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import VetSelector from './VetSelector';
import MapPicker from '@/components/MapPicker';

interface VaccinationSchedulerProps {
  petId: number;
  petName: string;
}

export default function VaccinationScheduler({ petId, petName }: VaccinationSchedulerProps) {
  const { data: vaccinations, isLoading } = useGetPetVaccinations(petId);
  const scheduleVaccination = useScheduleVaccination();
  const updateStatus = useUpdateVaccinationStatus();
  const deleteVaccination = useDeleteVaccination();

  const [showForm, setShowForm] = useState(false);
  const [showVetSelector, setShowVetSelector] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null);
  const [selectedVetName, setSelectedVetName] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<'auto' | 'manual'>('manual');

  const handleUseMyLocation = () => {
    setIsLocating(true);
    setMapPickerMode('auto');
    setShowMapPicker(true);
  };

  const handleSchedule = async () => {
    if (!vaccineName || !scheduledDate || !selectedVetId) {
      toast.error('Please fill in all required fields including selecting a vet');
      return;
    }

    if (!currentLocation) {
      toast.error('Please set your current location before scheduling');
      return;
    }

    scheduleVaccination.mutate(
      {
        petId,
        vaccineName,
        scheduledDate: new Date(scheduledDate).toISOString(),
        assignedVetId: selectedVetId,
        notes: notes || undefined,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      {
        onSuccess: () => {
          setVaccineName('');
          setScheduledDate('');
          setNotes('');
          setSelectedVetId(null);
          setSelectedVetName(null);
          setShowForm(false);
        },
      }
    );
  };

  const handleSelectVet = (vetId: string, vetName: string) => {
    setSelectedVetId(vetId);
    setSelectedVetName(vetName);
    setShowVetSelector(false);
  };

  const handleMarkCompleted = (vaccinationId: number) => {
    updateStatus.mutate({
      vaccinationId,
      status: 'COMPLETED',
    });
  };

  const handleMarkSkipped = (vaccinationId: number) => {
    updateStatus.mutate({
      vaccinationId,
      status: 'SKIPPED',
    });
  };

  const handleDelete = (vaccinationId: number) => {
    if (confirm('Are you sure you want to delete this vaccination schedule?')) {
      deleteVaccination.mutate(vaccinationId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SKIPPED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const isUpcoming = (date: string) => {
    const vaccDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((vaccDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vaccination Schedule - {petName}</CardTitle>
        <CardDescription>Schedule and track vaccinations for your pet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          {showForm ? 'Cancel' : '+ Schedule Vaccination'}
        </Button>

        {showForm && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vaccine Name</label>
              <Input
                placeholder="e.g., Rabies, DHPP, etc."
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input
                type="datetime-local"
                className="font-sans"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Veterinary Clinic *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={handleUseMyLocation}
                  variant="outline"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Use My Location
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setMapPickerMode('manual');
                    setShowMapPicker(true);
                  }}
                  variant="outline"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Pick on Map
                </Button>
              </div>
              {currentLocation && (
                <p className="text-xs text-muted-foreground">
                  Current location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </p>
              )}
              <Button
                onClick={() => {
                  if (!currentLocation) {
                    toast.error('Set current location first using "Use My Location" or "Pick on Map"');
                    return;
                  }
                  setShowVetSelector(true);
                }}
                variant="outline"
                className="w-full justify-start"
              >
                {selectedVetName ? (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    {selectedVetName}
                  </>
                ) : (
                  'Select a Vet Clinic'
                )}
              </Button>
              {selectedVetName && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedVetName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                placeholder="e.g., Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSchedule}
              disabled={scheduleVaccination.isPending || !selectedVetId}
              className="w-full"
            >
              {scheduleVaccination.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Vaccination'
              )}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : vaccinations && vaccinations.length > 0 ? (
          <div className="space-y-2">
            {vaccinations.map((vacc) => (
              <div key={vacc.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{vacc.vaccineName}</span>
                      <Badge className={getStatusColor(vacc.status)}>
                        {vacc.status}
                      </Badge>
                      {isUpcoming(vacc.scheduledDate) && (
                        <Badge variant="destructive">Upcoming!</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(vacc.scheduledDate).toLocaleDateString()} at{' '}
                      {new Date(vacc.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {vacc.notes && (
                      <p className="text-sm mt-2 text-gray-600">{vacc.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {vacc.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkCompleted(vacc.id)}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkSkipped(vacc.id)}
                          disabled={updateStatus.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(vacc.id)}
                      disabled={deleteVaccination.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No vaccinations scheduled yet</p>
        )}
      </CardContent>

      {/* Vet Selector Modal */}
      <VetSelector
        open={showVetSelector}
        onClose={() => setShowVetSelector(false)}
        onSelectVet={handleSelectVet}
        currentLocation={currentLocation}
      />
      <MapPicker
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        headlessLocate={mapPickerMode === 'auto'}
        onLocateError={() => {
          setIsLocating(false);
        }}
        initialLat={currentLocation?.latitude}
        initialLng={currentLocation?.longitude}
        onPick={(lat, lng) => {
          setCurrentLocation({ latitude: lat, longitude: lng });
          setIsLocating(false);
          setShowMapPicker(false);
        }}
      />
    </Card>
  );
}
