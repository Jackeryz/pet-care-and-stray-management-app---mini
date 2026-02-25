import { useState } from 'react';
import {
  useListAdoptionRecords,
  useCreateAdoptionRequest,
  useGetAvailablePetsForAdoption,
  useGetUnreadChatCount,
  useGetCallerUserProfile,
  useAcceptAdoptionRequest,
  useRejectAdoptionRequest,
} from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, MessageCircle, Check, X, MapPin } from 'lucide-react';
import type { Pet } from '../../types';
import { getApiBaseUrl } from '../../hooks/useAuth';
import { AdoptionChatModal } from '../AdoptionChatModal';

export default function AdoptionTab() {
  const { data: adoptionRecords, isLoading: requestsLoading } = useListAdoptionRecords();
  const { data: availablePets, isLoading: petsLoading } = useGetAvailablePetsForAdoption();
  const { data: currentUser } = useGetCallerUserProfile();
  const { data: unreadData } = useGetUnreadChatCount();
  const createRequest = useCreateAdoptionRequest();
  const acceptRequest = useAcceptAdoptionRequest();
  const rejectRequest = useRejectAdoptionRequest();

  const [selectedAdoption, setSelectedAdoption] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const isLoading = requestsLoading || petsLoading;

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
  const inboundRequests = adoptionRecords?.filter(
    (r) => r.pet?.ownerId === currentUser?.id && r.status === 'PENDING',
  ) || [];
  
  const myRequests = adoptionRecords?.filter(
    (r) => r.applicantId === currentUser?.id,
  ) || [];

  return (
    <div className="space-y-8">
      {/* Inbound Adoption Requests (for my pets) */}
      {(currentUser?.role === 'PET_OWNER' || currentUser?.role === 'ADMIN') && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">Adoption Requests for My Pets</h3>
            <p className="text-muted-foreground">People interested in adopting your pets</p>
          </div>

          {inboundRequests.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inboundRequests.map((record) => {
                const pet = adoptionRecords?.find((r) => r.petId === record.petId)?.pet;
                return (
                  <InboundRequestCard
                    key={record.id}
                    record={record}
                    pet={pet}
                    currentUser={currentUser}
                    onAccept={() => acceptRequest.mutate(record.id)}
                    onReject={() => rejectRequest.mutate(record.id)}
                    isAccepting={acceptRequest.isPending}
                    isRejecting={rejectRequest.isPending}
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
      )}

      {/* My Adoption Requests */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">My Adoption Requests</h3>
          <p className="text-muted-foreground">Track your adoption applications</p>
        </div>

        {myRequests.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myRequests.map((record) => {
              const pet = adoptionRecords?.find((r) => r.id === record.id)?.pet;
              const unreadCount = unreadData?.adoptionUnreadCounts?.[record.id] || 0;
              return (
                <MyRequestCard
                  key={record.id}
                  record={record}
                  pet={pet}
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

        {availablePets && availablePets.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availablePets.map((pet) => (
              <Card key={pet.id}>
                {pet.photoUrl && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={`${getApiBaseUrl()}${pet.photoUrl}`}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed} • {pet.age} years old
                  </CardDescription>
                  {pet.owner && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      Owner: {pet.owner.name}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => createRequest.mutate(pet.id)}
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
  isAccepting,
  isRejecting,
}: {
  record: any;
  pet?: Pet;
  currentUser?: any;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  return (
    <Card>
      {pet && pet.photoUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={`${getApiBaseUrl()}${pet.photoUrl}`}
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
          <Badge variant="secondary">Pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pet && (
          <p className="text-sm text-muted-foreground">
            {pet.breed} • {pet.age} years old
          </p>
        )}

        {record.applicant && (
          <div className="text-sm border-t pt-3">
            <p className="font-semibold">Interested Applicant</p>
            <p className="text-muted-foreground">{record.applicant.name}</p>
            <p className="text-muted-foreground text-xs">{record.applicant.email}</p>
          </div>
        )}

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
            src={`${getApiBaseUrl()}${pet.photoUrl}`}
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
            {pet.breed} • {pet.age} years old
          </p>
        )}

        {record.pet?.owner && (
          <div className="text-sm border-t pt-3">
            <p className="font-semibold">Pet Owner</p>
            <p className="text-muted-foreground">{record.pet.owner.name}</p>
            <p className="text-muted-foreground text-xs">{record.pet.owner.email}</p>
          </div>
        )}

        {/* Chat Button - Only show for approved adoptions */}
        {record.status === 'APPROVED' && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onChatClick}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat
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

