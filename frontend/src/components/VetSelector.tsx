import React, { useState, useEffect } from 'react';
import { useGetAvailableVets } from '../hooks/useQueries';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix marker icon paths for Leaflet
delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  onSelectVet: (vetId: string, vetName: string) => void;
  open: boolean;
  onClose: () => void;
  currentLocation?: { latitude: number; longitude: number } | null;
}

export default function VetSelector({ onSelectVet, open, onClose, currentLocation }: Props) {
  const { data: availableVets, isLoading, isError, error } = useGetAvailableVets(
    currentLocation ?? undefined,
    open && !!currentLocation
  );
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);

  // Center map on live user location when available, otherwise first nearby vet.
  useEffect(() => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      return;
    }

    if (availableVets && availableVets.length > 0) {
      setMapCenter([availableVets[0].latitude, availableVets[0].longitude]);
    }
  }, [availableVets, currentLocation]);

  const handleSelect = () => {
    if (selectedVetId) {
      const vet = availableVets?.find((v) => v.id === selectedVetId);
      if (vet) {
        onSelectVet(vet.id, vet.name);
        onClose();
      }
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Failed to load available vets';
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unable to Find Nearby Vets</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!availableVets || availableVets.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Vets Available</DialogTitle>
            <DialogDescription>
              There are no vets within 50 km of your current or saved location.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Veterinary Clinic</DialogTitle>
          <DialogDescription>
            Choose a vet from the map or list below. All vets are within 50 km of your location.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          {/* Map */}
          <div className="rounded-lg overflow-hidden border bg-muted">
            <MapContainer center={mapCenter} zoom={10} style={{ height: '400px', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Your location (center) */}
              {mapCenter && (
                <CircleMarker
                  center={mapCenter}
                  radius={6}
                  pathOptions={{
                    color: 'blue',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: 'lightblue',
                    fillOpacity: 0.8,
                  }}
                >
                  <Popup>Your Location</Popup>
                </CircleMarker>
              )}

              {/* Vet markers */}
              {availableVets.map((vet) => (
                <Marker
                  key={vet.id}
                  position={[vet.latitude, vet.longitude]}
                  title={vet.name}
                  eventHandlers={{
                    click: () => setSelectedVetId(vet.id),
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{vet.name}</p>
                      <p className="text-sm text-muted-foreground">{vet.email}</p>
                      <p className="text-sm font-medium">{vet.distance.toFixed(1)} km away</p>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedVetId(vet.id);
                          handleSelect();
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Vet List */}
          <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2">
            {availableVets.map((vet) => (
              <Card
                key={vet.id}
                className={`cursor-pointer transition-all ${
                  selectedVetId === vet.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedVetId(vet.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{vet.name}</CardTitle>
                      <CardDescription className="text-sm">{vet.email}</CardDescription>
                    </div>
                    <Badge
                      variant={selectedVetId === vet.id ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {vet.distance.toFixed(1)} km
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Latitude: {vet.latitude.toFixed(4)}, Longitude: {vet.longitude.toFixed(4)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedVetId}
          >
            Select Vet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
