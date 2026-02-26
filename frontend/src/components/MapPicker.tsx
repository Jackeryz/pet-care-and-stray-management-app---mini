import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, Search } from 'lucide-react';
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
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  );
  const [placeQuery, setPlaceQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLat != null && initialLng != null) setPos([initialLat, initialLng]);
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (!open || pos || initialLat != null || initialLng != null || !navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (location) => {
        setPos([location.coords.latitude, location.coords.longitude]);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [initialLat, initialLng, open, pos]);

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

  const handlePlaceSearch = async () => {
    if (!placeQuery.trim()) return;

    try {
      setSearchError(null);
      setIsSearching(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeQuery.trim())}`,
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json() as Array<{ lat: string; lon: string }>;
      if (!data.length) {
        setSearchError('No place found. Try a more specific search.');
        return;
      }

      setPos([Number(data[0].lat), Number(data[0].lon)]);
    } catch {
      setSearchError('Could not search right now. Please try again.');
    } finally {
      setIsSearching(false);
    }
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
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Search place name (e.g., Chennai, India)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handlePlaceSearch();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handlePlaceSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchError && <p className="text-xs text-destructive">{searchError}</p>}
          {isLocating && <p className="text-xs text-muted-foreground">Trying to pin your current location…</p>}
        </div>
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
