import React, { useState } from 'react';
import { Loader2, Edit2, Check, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateLocation, useGetCallerUserProfile } from '../hooks/useQueries';
import { toast } from 'sonner';
import MapPicker from './MapPicker';

export default function LocationEditor() {
  const { data: userData } = useGetCallerUserProfile();
  const updateLocation = useUpdateLocation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newLatitude, setNewLatitude] = useState<number | null>(userData?.latitude || null);
  const [newLongitude, setNewLongitude] = useState<number | null>(userData?.longitude || null);
  const [error, setError] = useState('');

  const validateLocation = () => {
    if (newLatitude === null || newLongitude === null) {
      return 'Location is required';
    }
    if (newLatitude === userData?.latitude && newLongitude === userData?.longitude) {
      return 'New location must be different from current one';
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validateLocation();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newLatitude !== null && newLongitude !== null) {
      updateLocation.mutate(
        { latitude: newLatitude, longitude: newLongitude },
        {
          onSuccess: () => {
            setIsEditing(false);
            setNewLatitude(userData?.latitude || null);
            setNewLongitude(userData?.longitude || null);
            setError('');
          },
          onError: (error: any) => {
            const message = error.message || 'Failed to update location';
            setError(message);
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewLatitude(userData?.latitude || null);
    setNewLongitude(userData?.longitude || null);
    setError('');
    setShowMapPicker(false);
  };

  const handleMapPick = (lat: number, lng: number) => {
    setNewLatitude(lat);
    setNewLongitude(lng);
    setShowMapPicker(false);
    setError('');
  };

  const isLocationValid =
    newLatitude !== null &&
    newLongitude !== null &&
    (newLatitude !== userData?.latitude || newLongitude !== userData?.longitude);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Base Location</CardTitle>
          <CardDescription>Your clinic or office location (used to match with pet owners)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            <div className="flex items-center justify-between">
              <div>
                {userData?.latitude && userData?.longitude ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <p className="text-sm font-mono text-muted-foreground">
                        {userData.latitude.toFixed(4)}, {userData.longitude.toFixed(4)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Your base location is set</p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">Location not set</p>
                    <p className="text-xs text-muted-foreground mt-1">Set your location to help pet owners find you</p>
                  </>
                )}
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Location on Map</label>
                {newLatitude !== null && newLongitude !== null && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                    <p className="font-mono">
                      {newLatitude.toFixed(4)}, {newLongitude.toFixed(4)}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => setShowMapPicker(true)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Choose Location on Map
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                💡 You can change your location once every 7 days
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!isLocationValid || updateLocation.isPending}
                  className="gap-2"
                >
                  {updateLocation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4" />
                  Save Location
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Picker Modal */}
      <MapPicker
        initialLat={newLatitude || undefined}
        initialLng={newLongitude || undefined}
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onPick={handleMapPick}
      />
    </>
  );
}
