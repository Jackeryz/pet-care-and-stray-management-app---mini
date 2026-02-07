import { useListAdoptionRecords, useCreateAdoptionRequest, useListPets } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart } from 'lucide-react';
import type { AdoptionRecord, Pet } from '../../types';
import { getApiBaseUrl } from '../../hooks/useAuth';

export default function AdoptionTab() {
  const { data: adoptionRecords, isLoading: recordsLoading } = useListAdoptionRecords();
  const { data: pets, isLoading: petsLoading } = useListPets();
  const createRequest = useCreateAdoptionRequest();

  const isLoading = recordsLoading || petsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get pet IDs that already have adoption requests
  const adoptedPetIds = new Set(adoptionRecords?.map(r => r.petId) || []);

  // Available pets for adoption (pets without adoption requests)
  const availablePets = pets?.filter(pet => !adoptedPetIds.has(pet.id)) || [];

  return (
    <div className="space-y-8">
      {/* My Adoption Requests */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">My Adoption Requests</h3>
          <p className="text-muted-foreground">Track your adoption applications</p>
        </div>

        {adoptionRecords && adoptionRecords.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adoptionRecords.map((record) => {
              const pet = pets?.find(p => p.id === record.petId);
              return (
                <AdoptionRequestCard key={record.id} record={record} pet={pet} />
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

        {availablePets.length > 0 ? (
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
              <img
                src="/assets/generated/pet-adoption-family.dim_800x600.jpg"
                alt="Pet adoption"
                className="w-64 h-48 object-cover rounded-lg mb-4"
              />
              <p className="text-muted-foreground">No pets available for adoption at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AdoptionRequestCard({ record, pet }: { record: AdoptionRecord; pet?: Pet }) {
  const getStatusBadge = (status: AdoptionRecord['status']) => {
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
      {pet && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={URL.createObjectURL(new Blob([new Uint8Array(pet.photo)], { type: 'image/jpeg' }))}
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
      {pet && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pet.breed} • {pet.age} years old
          </p>
        </CardContent>
      )}
    </Card>
  );
}

