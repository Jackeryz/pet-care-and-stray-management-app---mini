import React, { useState } from 'react';
import { useGetAssignedVaccinations, useUpdateVaccinationStatusAsVet } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function VetVaccinationsTab() {
  const { data: vaccinations, isLoading } = useGetAssignedVaccinations();
  const { mutate: updateStatus, isPending } = useUpdateVaccinationStatusAsVet();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'skipped'>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredVaccinations = vaccinations?.filter((v) => {
    if (filter === 'all') return true;
    return v.status.toLowerCase() === filter;
  }) || [];

  const statusCounts = {
    pending: vaccinations?.filter((v) => v.status === 'PENDING').length || 0,
    completed: vaccinations?.filter((v) => v.status === 'COMPLETED').length || 0,
    skipped: vaccinations?.filter((v) => v.status === 'SKIPPED').length || 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SKIPPED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (vaccinationId: number, newStatus: 'PENDING' | 'COMPLETED' | 'SKIPPED') => {
    updateStatus({ vaccinationId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Assigned Vaccinations</h3>
        <p className="text-muted-foreground">Vaccinations assigned to you for pet owners nearby</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Skipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{statusCounts.skipped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vaccinations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vaccinations List */}
      {filteredVaccinations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVaccinations.map((vaccination) => (
            <Card key={vaccination.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{vaccination.pet?.name}</CardTitle>
                    <CardDescription>{vaccination.pet?.breed}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(vaccination.status)}>
                    {vaccination.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {/* Vaccination Info */}
                <div className="space-y-2 border-b pb-4">
                  <p className="font-semibold text-sm">{vaccination.vaccineName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(vaccination.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Owner Info */}
                <div className="space-y-2 border-b pb-4 text-sm">
                  <p className="font-semibold">Pet Owner</p>
                  <p className="text-muted-foreground">{vaccination.pet?.owner?.name}</p>
                  <p className="text-xs text-muted-foreground">{vaccination.pet?.owner?.email}</p>
                  {vaccination.pet?.owner?.latitude && vaccination.pet?.owner?.longitude && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      <span>Location data available</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {vaccination.notes && (
                  <div className="border-b pb-4 text-sm">
                    <p className="font-semibold mb-1">Notes</p>
                    <p className="text-muted-foreground">{vaccination.notes}</p>
                  </div>
                )}

                {/* Status Update */}
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-semibold">Update Status</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={vaccination.status === 'COMPLETED' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(vaccination.id, 'COMPLETED')}
                      disabled={isPending}
                      className="flex-1"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant={vaccination.status === 'SKIPPED' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(vaccination.id, 'SKIPPED')}
                      disabled={isPending}
                      className="flex-1"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                      Skip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {filter === 'all'
                ? 'No vaccinations assigned to you yet'
                : `No ${filter} vaccinations`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
