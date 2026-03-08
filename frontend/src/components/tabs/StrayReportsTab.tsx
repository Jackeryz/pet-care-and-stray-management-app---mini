import { useState, useEffect } from 'react';
import { useListStrayReports, useReportStray, useUpdateReportStatus, useGetCallerUserProfile } from '../../hooks/useQueries';
import { useStrayReportNotifications } from '../../hooks/useSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, MapPin } from 'lucide-react';
import type { StrayReport, ReportStatus, NgoReportStatus, VetReportStatus, Role } from '../../types';
import MapPicker from '@/components/MapPicker';
import { toast } from 'sonner';

const NGO_ACTIONS: NgoReportStatus[] = ['RESCUED', 'HOUSED', 'RESOLVED'];
const VET_ACTIONS: VetReportStatus[] = ['FIRST_AID_PROVIDED', 'HOUSED_AT_VET', 'RESOLVED'];

export default function StrayReportsTab() {
  const { data: allReports, isLoading: allLoading, refetch } = useListStrayReports();
  const { data: userProfile } = useGetCallerUserProfile();
  const { onStrayReportReceived } = useStrayReportNotifications();
  const [showReportForm, setShowReportForm] = useState(false);

  const isResponder = userProfile?.role === 'NGO' || userProfile?.role === 'VET';

  useEffect(() => {
    if (!isResponder) return;

    onStrayReportReceived((data) => {
      const responderRole = data.responderRole ? String(data.responderRole).toLowerCase() : 'responder';
      toast.success(`New stray alert for ${responderRole} at ${data.location}: ${data.description}`, {
        duration: 5000,
      });
      refetch();
    });
  }, [isResponder, onStrayReportReceived, refetch]);

  if (allLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const reports = allReports || [];
  const isEmpty = reports.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{isResponder ? 'Received Reports' : 'My Stray Reports'}</h3>
          <p className="text-muted-foreground">
            {isResponder ? 'Reports you have been alerted about' : 'Track the status of stray reports you have made'}
          </p>
        </div>
        {!isResponder && (
          <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Report Stray
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ReportStrayForm onSuccess={() => setShowReportForm(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{isResponder ? 'No reports yet' : "You haven't reported any strays yet"}</p>
            {!isResponder && (
              <Button onClick={() => setShowReportForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Report a Stray Animal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <StrayReportCard
              key={report.id}
              report={report}
              userRole={(userProfile?.role as Role | undefined) ?? 'PUBLIC_USER'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StrayReportCard({ report, userRole }: { report: StrayReport; userRole: Role }) {
  const updateStatus = useUpdateReportStatus();
  const isNGO = userRole === 'NGO';
  const isVET = userRole === 'VET';

  const getOverallStatusBadge = (status: ReportStatus) => {
    const variants: Record<ReportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      REPORTED: 'destructive',
      VERIFIED: 'secondary',
      RESCUED: 'default',
      RESOLVED: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>Overall: {status}</Badge>;
  };

  const getNgoStatusBadge = (status?: NgoReportStatus) => {
    const value = status || 'PENDING';
    const variant: 'default' | 'secondary' | 'outline' =
      value === 'RESOLVED' ? 'default' : value === 'PENDING' ? 'outline' : 'secondary';
    return <Badge variant={variant}>NGO: {value}</Badge>;
  };

  const getVetStatusBadge = (status?: VetReportStatus) => {
    const value = status || 'PENDING';
    const variant: 'default' | 'secondary' | 'outline' =
      value === 'RESOLVED' ? 'default' : value === 'PENDING' ? 'outline' : 'secondary';
    const label = value === 'HOUSED_AT_VET' ? 'HOUSED' : value;
    return <Badge variant={variant}>VET: {label}</Badge>;
  };

  const handleUpdate = (status: string) => {
    updateStatus.mutate({ id: report.id, status });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">Report #{report.id}</CardTitle>
          {getOverallStatusBadge(report.status)}
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {report.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{report.description}</p>

        <div className="flex flex-wrap gap-2">
          {getNgoStatusBadge(report.ngoStatus)}
          {getVetStatusBadge(report.vetStatus)}
        </div>

        {report.sharedVetBaseLocation && (
          <p className="text-xs text-muted-foreground">
            Vet base location shared: {report.sharedVetBaseLocation.responderName || 'Vet'} ({report.sharedVetBaseLocation.latitude.toFixed(4)},{' '}
            {report.sharedVetBaseLocation.longitude.toFixed(4)})
          </p>
        )}

        {report.sharedNgoBaseLocation && (
          <p className="text-xs text-muted-foreground">
            NGO base location shared: {report.sharedNgoBaseLocation.responderName || 'NGO'} ({report.sharedNgoBaseLocation.latitude.toFixed(4)},{' '}
            {report.sharedNgoBaseLocation.longitude.toFixed(4)})
          </p>
        )}

        {isNGO && (
          <div className="space-y-2">
            <p className="text-xs font-medium">NGO Actions</p>
            <div className="flex flex-wrap gap-2">
              {NGO_ACTIONS.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={report.ngoStatus === status ? 'default' : 'outline'}
                  onClick={() => handleUpdate(status)}
                  disabled={updateStatus.isPending}
                >
                  {status === 'HOUSED' ? 'Housed' : status === 'RESCUED' ? 'Rescued' : 'Resolved'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isVET && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Vet Actions</p>
            <div className="flex flex-wrap gap-2">
              {VET_ACTIONS.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={report.vetStatus === status ? 'default' : 'outline'}
                  onClick={() => handleUpdate(status)}
                  disabled={updateStatus.isPending}
                >
                  {status === 'FIRST_AID_PROVIDED'
                    ? 'First Aid Provided'
                    : status === 'HOUSED_AT_VET'
                      ? 'Housed'
                      : 'Resolved'}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportStrayForm({ onSuccess }: { onSuccess: () => void }) {
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<'auto' | 'manual'>('manual');
  const reportStray = useReportStray();

  const handleGetLocation = () => {
    setGeoLoading(true);
    setMapPickerMode('auto');
    setShowMapPicker(true);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.display_name as string | null;
    } catch {
      return null;
    }
  };

  const handleMapPick = async (lat: number, lng: number) => {
    setGeoLoading(false);
    setLatitude(lat);
    setLongitude(lng);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setLocation(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    reportStray.mutate(
      {
        location,
        photo,
        description,
        latitude,
        longitude,
      },
      {
        onSuccess,
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Report Stray Animal</DialogTitle>
        <DialogDescription>Help us rescue animals in need by reporting their location</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g., Main Street near Park"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Get Coordinates</Label>
          <Button
            type="button"
            variant="outline"
            onClick={handleGetLocation}
            disabled={geoLoading}
            className="w-full"
          >
            {geoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Use Current Location
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMapPickerMode('manual');
              setShowMapPicker(true);
            }}
            className="w-full mt-2"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Pick on Map
          </Button>
          {latitude && longitude && (
            <p className="text-xs text-muted-foreground">
              Coordinates: {latitude.toFixed(4)} deg, {longitude.toFixed(4)} deg
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the animal and situation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stray-photo">Photo</Label>
          <Input
            id="stray-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={reportStray.isPending}>
          {reportStray.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </Button>
      </form>

      <MapPicker
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        headlessLocate={mapPickerMode === 'auto'}
        onLocateError={() => {
          setGeoLoading(false);
        }}
        onPick={handleMapPick}
        initialLat={latitude ?? undefined}
        initialLng={longitude ?? undefined}
      />
    </>
  );
}
