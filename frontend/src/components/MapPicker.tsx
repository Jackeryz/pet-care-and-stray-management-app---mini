import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix marker icon paths for Leaflet in many bundlers
delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function MapPicker({
  initialLat,
  initialLng,
  open,
  onClose,
  onPick,
}: {
  initialLat?: number;
  initialLng?: number;
  open: boolean;
  onClose: () => void;
  onPick: (lat: number, lng: number) => void;
}) {
  const [pos, setPos] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  );

  useEffect(() => {
    if (initialLat && initialLng) setPos([initialLat, initialLng]);
  }, [initialLat, initialLng]);

  function LocationSelector() {
    useMapEvents({
      click(e) {
        setPos([e.latlng.lat, e.latlng.lng]);
      },
    });
    return pos ? <Marker position={pos as any} /> : null;
  }

  const handleConfirm = () => {
    if (pos) onPick(pos[0], pos[1]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a Location on the Map</DialogTitle>
        </DialogHeader>
        <div style={{ height: 400 }} className="w-full">
          <MapContainer
            center={pos || [0, 0]}
            zoom={pos ? 13 : 2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationSelector />
          </MapContainer>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!pos}>Use this location</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
