import { useState } from 'react';
import { useListStrayReports, useReportStray, useUpdateReportStatus, useGetCallerUserProfile } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, MapPin } from 'lucide-react';
import type { StrayReport, ReportStatus } from '../../types';
import { getApiBaseUrl } from '../../hooks/useAuth';

export default function StrayReportsTab() {
  const { data: allReports, isLoading: allLoading } = useListStrayReports();
  const { data: userProfile } = useGetCallerUserProfile();
  const [showReportForm, setShowReportForm] = useState(false);

  const isNGO = userProfile?.role === 'NGO';

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
          <h3 className="text-2xl font-bold">
            {isNGO ? 'Received Reports' : 'My Stray Reports'}
          </h3>
          <p className="text-muted-foreground">
            {isNGO 
              ? 'Reports you have been notified about'
              : 'Track the status of stray reports you have made'}
          </p>
        </div>
        {!isNGO && (
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
            <img
              src="/assets/generated/stray-dog-street.dim_600x400.jpg"
              alt="Stray animal"
              className="w-64 h-48 object-cover rounded-lg mb-4"
            />
            <p className="text-muted-foreground mb-4">
              {isNGO 
                ? 'No reports yet' 
                : 'You haven\'t reported any strays yet'}
            </p>
            {!isNGO && (
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
            <StrayReportCard key={report.id} report={report} isNGO={isNGO} />
          ))}
        </div>
      )}
    </div>
  );
}

function StrayReportCard({ report, isNGO }: { report: StrayReport; isNGO: boolean }) {
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const updateStatus = useUpdateReportStatus();
  const [newStatus, setNewStatus] = useState<string>('');

  const getStatusBadge = (status: ReportStatus) => {
    const variants: Record<ReportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      REPORTED: 'destructive',
      VERIFIED: 'secondary',
      RESCUED: 'default',
      RESOLVED: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateStatus.mutate(
      { id: report.id, status: newStatus as ReportStatus },
      {
        onSuccess: () => setShowStatusUpdate(false),
      }
    );
  };

  return (
    <Card>
      {report.photoUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={`${getApiBaseUrl()}${report.photoUrl}`}
            alt="Stray animal"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Report #{report.id}</CardTitle>
          {getStatusBadge(report.status)}
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {report.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{report.description}</p>
        {isNGO && (
          <>
            {!showStatusUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowStatusUpdate(true)}
              >
                Update Status
              </Button>
            ) : (
              <div className="space-y-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="RESCUED">Rescued</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleStatusUpdate}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowStatusUpdate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
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
  const reportStray = useReportStray();

  const handleGetLocation = async () => {
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch (error) {
      console.error('Geolocation error:', error);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    const arrayBuffer = await photo.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    reportStray.mutate(
      {
        location,
        photo: uint8Array,
        description,
        latitude,
        longitude,
      },
      {
        onSuccess,
      }
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
          {latitude && longitude && (
            <p className="text-xs text-muted-foreground">
              Coordinates: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
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
    </>
  );
}

