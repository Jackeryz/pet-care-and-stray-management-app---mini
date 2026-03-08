import { useState, useEffect, useCallback } from 'react';
import {
  useListAdoptionRecords,
  useCreateAdoptionRequest,
  useGetAvailablePetsForAdoption,
  useGetUnreadChatCount,
  useGetCallerUserProfile,
  useAcceptAdoptionRequest,
  useRejectAdoptionRequest,
  useTransferAdoptedPet,
} from '../../hooks/useQueries';
import { useAdoptionRequestNotifications } from '../../hooks/useSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, MessageCircle, Check, X, MapPin } from 'lucide-react';
import type { Pet } from '../../types';
import { getApiBaseUrl, buildApiUrl } from '../../hooks/useAuth';
import { AdoptionChatModal } from '../AdoptionChatModal';
import { toast } from 'sonner';

function getPetAgeLabel(pet?: Pet): string {
  if (!pet) return 'Age not set';
  if (pet.birthdate) {
    const normalized = pet.birthdate.replace(/\s+/g, '');
    const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const m = normalized.match(ddmmyyyy);
    const birth = m
      ? new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00.000Z`)
      : new Date(normalized);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years--;
      return `${Math.max(0, years)} years old`;
    }
  }
  if (typeof pet.age === 'number' && pet.age > 0) return `${pet.age} years old`;
  return 'Age not set';
}

export default function AdoptionTab() {
  const { data: adoptionRecords, isLoading: requestsLoading, refetch } = useListAdoptionRecords();
  const { data: availablePets, isLoading: petsLoading } = useGetAvailablePetsForAdoption();
  const { data: currentUser } = useGetCallerUserProfile();
  const { data: unreadData } = useGetUnreadChatCount();
  const createRequest = useCreateAdoptionRequest();
  const acceptRequest = useAcceptAdoptionRequest();
  const rejectRequest = useRejectAdoptionRequest();
  const transferPet = useTransferAdoptedPet();

  const [selectedAdoption, setSelectedAdoption] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newRequestNotification, setNewRequestNotification] = useState<any | null>(null);

  const isLoading = requestsLoading || petsLoading;

  // Handle adoption request notifications
  const handleAdoptionRequest = useCallback((data: any) => {
    console.log('🔔 [Frontend] Adoption request received:', data);
    toast.success(`${data.applicantName} requested to adopt ${data.petName}!`, {
      duration: 5000,
    });
    setNewRequestNotification(data);
    // Refetch adoption records to show new request
    refetch();
  }, [refetch]);

  // Listen for real-time adoption request notifications
  useAdoptionRequestNotifications(handleAdoptionRequest);

  const handleRequestAdoption = (petId: number, petName: string) => {
    console.log(`📤 [Frontend] Requesting adoption for pet ${petId} (${petName})`);
    createRequest.mutate(petId, {
      onSuccess: () => {
        console.log(`✓ [Frontend] Adoption request created successfully for pet ${petId}`);
      },
      onError: (error) => {
        console.error(`✗ [Frontend] Adoption request failed for pet ${petId}:`, error);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleOpenChat = (adoption: any) => {
    setSelectedAdoption(adoption);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedAdoption(null);
  };

  // Separate inbound requests (for my pets) from outbound (my requests)
  // Show both PENDING and APPROVED requests so users can chat after accepting
  const inboundRequests = adoptionRecords?.filter(
    (r) =>
      r.pet?.ownerId === currentUser?.id &&
      r.applicantId !== currentUser?.id &&
      ['PENDING', 'APPROVED'].includes(r.status),
  ) || [];
  
  const myRequests = adoptionRecords?.filter(
    (r) =>
      r.applicantId === currentUser?.id &&
      r.pet?.ownerId !== currentUser?.id &&
      ['PENDING', 'APPROVED'].includes(r.status),
  ) || [];

  // Filter out user's own pets from available pets (safety check)
  const filteredAvailablePets = availablePets?.filter(
    (pet) => pet.ownerId !== currentUser?.id
  ) || [];

  const parseMedicalArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value !== 'string') return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8">
      {/* Inbound Adoption Requests (for my pets) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Adoption Requests for My Pets</h3>
          <p className="text-muted-foreground">People interested in adopting your pets</p>
        </div>

        {inboundRequests.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inboundRequests.map((record) => {
            return (
              <InboundRequestCard
                key={record.id}
                record={record}
                pet={record.pet}
                currentUser={currentUser}
                onAccept={() => acceptRequest.mutate(record.id)}
                onReject={() => rejectRequest.mutate(record.id)}
                onTransfer={() => transferPet.mutate(record.id)}
                isAccepting={acceptRequest.isPending}
                isRejecting={rejectRequest.isPending}
                isTransferring={transferPet.isPending}
                onChatClick={() => handleOpenChat(record)}
              />
            );
          })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No adoption requests yet</p>
              </CardContent>
            </Card>
          )}
        </div>

      {/* My Adoption Requests */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">My Adoption Requests</h3>
          <p className="text-muted-foreground">Track your adoption applications</p>
        </div>

        {myRequests.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myRequests.map((record) => {
              const unreadCount = unreadData?.adoptionUnreadCounts?.[record.id] || 0;
              return (
                <MyRequestCard
                  key={record.id}
                  record={record}
                  pet={record.pet}
                  currentUser={currentUser}
                  unreadCount={unreadCount}
                  onChatClick={() => handleOpenChat(record)}
                />
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No adoption requests yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Available Pets for Adoption */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Available for Adoption</h3>
          <p className="text-muted-foreground">Give a loving home to these pets</p>
        </div>

        {filteredAvailablePets && filteredAvailablePets.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvailablePets.map((pet) => (
              <Card key={pet.id}>
                {pet.photoUrl && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={buildApiUrl(pet.photoUrl)}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed} • {getPetAgeLabel(pet)}
                  </CardDescription>
                  {pet.owner && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      Owner: {pet.owner.name}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {(() => {
                    const vaccinations = parseMedicalArray(pet?.medicalRecord?.vaccinations);
                    const treatments = parseMedicalArray(pet?.medicalRecord?.treatments);
                    const hasMedical = vaccinations.length > 0 || treatments.length > 0;

                    return (
                      <div className="mb-4 rounded-md border p-3">
                        <p className="text-sm font-semibold">Medical Records</p>
                        {hasMedical ? (
                          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                            <p>
                              Vaccinations: {vaccinations.length > 0 ? vaccinations.join(', ') : 'None listed'}
                            </p>
                            <p>
                              Treatments: {treatments.length > 0 ? treatments.join(', ') : 'None listed'}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No medical records available</p>
                        )}
                      </div>
                    );
                  })()}
                  <Button
                    className="w-full"
                    onClick={() => handleRequestAdoption(pet.id, pet.name)}
                    disabled={createRequest.isPending}
                  >
                    {createRequest.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Heart className="mr-2 h-4 w-4" />
                        Request Adoption
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No pets available for adoption at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Modal */}
      {selectedAdoption && (
        <AdoptionChatModal
          adoptionRecordId={selectedAdoption.id}
          petName={selectedAdoption.pet?.name || 'Pet'}
          otherUserName={
            currentUser?.id === selectedAdoption.applicantId
              ? selectedAdoption.pet?.owner?.name || 'Pet Owner'
              : selectedAdoption.applicant?.name || 'Applicant'
          }
          otherUserEmail={
            currentUser?.id === selectedAdoption.applicantId
              ? selectedAdoption.pet?.owner?.email || ''
              : selectedAdoption.applicant?.email || ''
          }
          isOpen={isChatOpen}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

function InboundRequestCard({
  record,
  pet,
  currentUser,
  onAccept,
  onReject,
  onTransfer,
  isAccepting,
  isRejecting,
  isTransferring,
  onChatClick,
}: {
  record: any;
  pet?: Pet;
  currentUser?: any;
  onAccept: () => void;
  onReject: () => void;
  onTransfer: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
  isTransferring: boolean;
  onChatClick?: () => void;
}) {
  return (
    <Card>
      {pet && pet.photoUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={buildApiUrl(pet.photoUrl)}
            alt={pet.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{pet?.name || `Pet #${record.petId}`}</CardTitle>
            <CardDescription>Request #{record.id}</CardDescription>
          </div>
          <Badge variant={record.status === 'APPROVED' ? 'default' : 'secondary'}>
            {record.status === 'PENDING' ? 'Pending' : record.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pet && (
          <p className="text-sm text-muted-foreground">
            {pet.breed} • {getPetAgeLabel(pet)}
          </p>
        )}

        {record.applicant && (
          <div className="text-sm border-t pt-3">
            <p className="font-semibold">Interested Applicant</p>
            <p className="text-muted-foreground">{record.applicant.name}</p>
            <p className="text-muted-foreground text-xs">{record.applicant.email}</p>
          </div>
        )}

        {/* Chat Button - Only show when APPROVED */}
        {record.status === 'APPROVED' && (
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={onChatClick}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat with Applicant
            </Button>
            <Button
              className="w-full"
              onClick={onTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                'Complete Adoption Transfer'
              )}
            </Button>
          </div>
        )}

        {/* Accept/Reject Buttons - Only show when PENDING */}
        {record.status === 'PENDING' && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={onAccept}
              disabled={isAccepting || isRejecting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onReject}
              disabled={isAccepting || isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyRequestCard({
  record,
  pet,
  currentUser,
  unreadCount,
  onChatClick,
}: {
  record: any;
  pet?: Pet;
  currentUser?: any;
  unreadCount?: number;
  onChatClick?: () => void;
}) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      PENDING: 'secondary',
      APPROVED: 'default',
      REJECTED: 'destructive',
    };
    const variant = variants[status] || 'secondary';
    const label = status.charAt(0) + status.slice(1).toLowerCase();
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card>
      {pet && pet.photoUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={buildApiUrl(pet.photoUrl)}
            alt={pet.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{pet?.name || `Pet #${record.petId}`}</CardTitle>
            <CardDescription>Request #{record.id}</CardDescription>
          </div>
          {getStatusBadge(record.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pet && (
          <p className="text-sm text-muted-foreground">
            {pet.breed} • {getPetAgeLabel(pet)}
          </p>
        )}

        {record.pet?.owner && (
          <div className="text-sm border-t pt-3">
            <p className="font-semibold">Pet Owner</p>
            <p className="text-muted-foreground">{record.pet.owner.name}</p>
            <p className="text-muted-foreground text-xs">{record.pet.owner.email}</p>
          </div>
        )}

        {/* Chat Button - Only show when APPROVED */}
        {record.status === 'APPROVED' && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onChatClick}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat with Owner
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


