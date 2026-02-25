import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix marker icon paths for Leaflet in many bundlers
delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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
    const map = useMapEvents({
      click(e) {
        setPos([e.latlng.lat, e.latlng.lng]);
      },
    });

    useEffect(() => {
      if (pos) {
        map.setView(pos, 13);
      }
    }, [map, pos]);

    return pos ? <Marker position={pos} /> : null;
  }

  const handleConfirm = () => {
    if (pos) onPick(pos[0], pos[1]);
    onClose();
  };

  const mapProps = {
    bounds: [
      [-90, -180],
      [90, 180],
    ],
    zoom: pos ? 13 : 2,
  } as any;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a Location on the Map</DialogTitle>
        </DialogHeader>
        <div style={{ height: 400 }} className="w-full">
          <MapContainer
            {...mapProps}
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
