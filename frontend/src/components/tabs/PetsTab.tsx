import { useState } from 'react';
import { useListPets, useCreatePet, useDeletePet, useGetMedicalRecord, useAddMedicalRecord, useUpdatePetPhoto, useUpdatePetBirthdate, useListPetForAdoption, useDelistPetFromAdoption } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Syringe, FileText, Trash2, Camera, Heart } from 'lucide-react';
import type { Pet } from '../../types';
import { getApiBaseUrl, buildApiUrl } from '../../hooks/useAuth';
import VaccinationScheduler from '../VaccinationScheduler';
import { toast } from 'sonner';

function getPetAgeFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const normalized = birthdate
    .replace(/\s+/g, '')
    .replace(/[/.]/g, '-')
    .replace(/[\u2013\u2014]/g, '-');
  const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  let birth: Date;
  const match = normalized.match(ddmmyyyy);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    birth = new Date(`${match[3]}-${month}-${day}T00:00:00.000Z`);
  } else {
    birth = new Date(normalized);
  }
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

function getPetAgeLabel(pet: Pet): string {
  const fromBirthdate = getPetAgeFromBirthdate(pet.birthdate);
  if (fromBirthdate != null) return `${fromBirthdate} years old`;
  if (typeof pet.age === 'number' && pet.age >= 0) return `${pet.age} years old`;
  return 'Age not set';
}

function formatBirthdateForDisplay(birthdate?: string | null): string {
  if (!birthdate) return '';
  const isoDateOnly = birthdate.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateOnly) {
    return `${isoDateOnly[3]}-${isoDateOnly[2]}-${isoDateOnly[1]}`;
  }
  const normalized = birthdate
    .replace(/\s+/g, '')
    .replace(/[/.]/g, '-')
    .replace(/[\u2013\u2014]/g, '-');
  const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const direct = normalized.match(ddmmyyyy);
  if (direct) {
    return `${direct[1].padStart(2, '0')}-${direct[2].padStart(2, '0')}-${direct[3]}`;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return birthdate;
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function PetsTab() {
  const { data: pets, isLoading } = useListPets();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showMedicalRecord, setShowMedicalRecord] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">My Pets</h3>
          <p className="text-muted-foreground">Manage your pets and their medical records</p>
        </div>
        <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AddPetForm onSuccess={() => setShowAddPet(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {pets && pets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No pets added yet</p>
            <Button onClick={() => setShowAddPet(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pets?.map((pet) => (
            <Card key={pet.id} className="overflow-hidden relative">
              {pet.photoUrl ? (
                <div className="aspect-video w-full overflow-hidden bg-muted relative group">
                  <img
                    src={buildApiUrl(pet.photoUrl)}
                    alt={pet.name}
                    className="h-full w-full object-cover"
                  />
                  <PhotoOverlayButton petId={pet.id} petName={pet.name} />
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                  <AddPhotoButton petId={pet.id} petName={pet.name} />
                </div>
              )}
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle>{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed}
                    {pet.birthdate ? (
                      <>
                        {' - '}
                        {getPetAgeLabel(pet)}
                      </>
                    ) : (
                      <> {' - '}{getPetAgeLabel(pet)}</>
                    )}
                  </CardDescription>
                  <BirthdateEditor pet={pet} />
                </div>
                <DeletePetButton petId={pet.id} petName={pet.name} compact={true} />
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedPet(pet);
                    setShowMedicalRecord(true);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Medical Records
                </Button>
                <AdoptionListingButton petId={pet.id} petName={pet.name} isListed={pet.isListed || false} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPet && (
        <Dialog open={showMedicalRecord} onOpenChange={setShowMedicalRecord}>
          <DialogContent className="max-w-2xl">
            <MedicalRecordView pet={selectedPet} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddPetForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const createPet = useCreatePet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedBirthdate = birthdate
      .replace(/\s+/g, '')
      .replace(/[/.]/g, '-')
      .replace(/[–—]/g, '-');
    if (formattedBirthdate && !/^\d{1,2}-\d{1,2}-\d{4}$/.test(formattedBirthdate)) {
      toast.error('Birthdate format should be DD-MM-YYYY');
      return;
    }

    createPet.mutate(
      {
        name,
        breed,
        birthdate: formattedBirthdate || undefined,
        photo: photo || undefined,
      },
      {
        onSuccess,
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Pet</DialogTitle>
        <DialogDescription>Add your pet's information to start tracking their health</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pet-name">Name</Label>
          <Input
            id="pet-name"
            placeholder="e.g., Max"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breed">Breed</Label>
          <Input
            id="breed"
            placeholder="e.g., Golden Retriever"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthdate">Birthdate</Label>
          <Input
            id="birthdate"
            type="text"
            placeholder="DD-MM-YYYY (optional)"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photo">Photo (Optional)</Label>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={createPet.isPending}>
          {createPet.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Pet'
          )}
        </Button>
      </form>
    </>
  );
}

function BirthdateEditor({ pet }: { pet: Pet }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const updateBirthdate = useUpdatePetBirthdate();

  const hasBirthdate = !!pet.birthdate;

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground mt-1 underline underline-offset-2"
        onClick={() => {
          setValue(hasBirthdate ? formatBirthdateForDisplay(pet.birthdate) : '');
          setOpen(true);
        }}
      >
        Birthdate: {hasBirthdate ? formatBirthdateForDisplay(pet.birthdate) : 'Not set'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Birthdate - {pet.name}</DialogTitle>
            <DialogDescription>Enter birthdate in DD-MM-YYYY format</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="DD-MM-YYYY"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={updateBirthdate.isPending}
                onClick={() => {
                  const formatted = value
                    .replace(/\s+/g, '')
                    .replace(/[/.]/g, '-')
                    .replace(/[\u2013\u2014]/g, '-');
                  if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(formatted)) {
                    toast.error('Birthdate format should be DD-MM-YYYY');
                    return;
                  }
                  updateBirthdate.mutate(
                    { petId: pet.id, birthdate: formatted },
                    { onSuccess: () => setOpen(false) },
                  );
                }}
              >
                {updateBirthdate.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MedicalRecordView({ pet }: { pet: Pet }) {
  const { data: medicalRecord, isLoading } = useGetMedicalRecord(pet.id);
  const [showAddRecord, setShowAddRecord] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Medical Records - {pet.name}</DialogTitle>
        <DialogDescription>View and manage medical history</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        <VaccinationScheduler petId={pet.id} petName={pet.name} />

        <Separator />

        {medicalRecord ? (
          <>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Past Vaccinations
              </h4>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.vaccinations.length > 0 ? (
                  medicalRecord.vaccinations.map((vac, idx) => (
                    <Badge key={idx} variant="secondary">
                      {vac}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No vaccinations recorded</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Treatments</h4>
              <div className="flex flex-wrap gap-2">
                {medicalRecord.treatments.length > 0 ? (
                  medicalRecord.treatments.map((treatment, idx) => (
                    <Badge key={idx} variant="outline">
                      {treatment}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No treatments recorded</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-4">No medical records found</p>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddRecord(!showAddRecord)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Medical Record
        </Button>

        {showAddRecord && <AddMedicalRecordForm petId={pet.id} />}
      </div>
    </>
  );
}

function AddMedicalRecordForm({ petId }: { petId: number }) {
  const [vaccinations, setVaccinations] = useState('');
  const [treatments, setTreatments] = useState('');
  const addMedicalRecord = useAddMedicalRecord();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMedicalRecord.mutate({
      petId,
      vaccinations: vaccinations.split(',').map(v => v.trim()).filter(Boolean),
      treatments: treatments.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="vaccinations">Vaccinations (comma-separated)</Label>
        <Input
          id="vaccinations"
          placeholder="e.g., Rabies, Distemper"
          value={vaccinations}
          onChange={(e) => setVaccinations(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="treatments">Treatments (comma-separated)</Label>
        <Input
          id="treatments"
          placeholder="e.g., Deworming, Flea treatment"
          value={treatments}
          onChange={(e) => setTreatments(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={addMedicalRecord.isPending}>
        {addMedicalRecord.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          'Add Record'
        )}
      </Button>
    </form>
  );
}

function DeletePetButton({ petId, petName, compact = false }: { petId: number; petName: string; compact?: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const deletePet = useDeletePet();

  const handleDelete = () => {
    deletePet.mutate(petId, {
      onSuccess: () => {
        setShowConfirm(false);
      },
    });
  };

  if (compact) {
    return (
      <>
        {!showConfirm ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : (
          <div className="absolute top-2 right-2 bg-white border rounded-lg p-3 shadow-lg z-10 w-48">
            <p className="text-xs text-muted-foreground mb-2">
              Delete {petName}?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleDelete}
                disabled={deletePet.isPending}
              >
                {deletePet.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Delete'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {!showConfirm ? (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Pet
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {petName}? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deletePet.isPending}
            >
              {deletePet.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function PhotoOverlayButton({ petId, petName }: { petId: number; petName: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const updatePetPhoto = useUpdatePetPhoto();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    updatePetPhoto.mutate(
      { petId, photo },
      {
        onSuccess: () => {
          setPhoto(null);
          setShowDialog(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <button className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="h-8 w-8 text-white" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Photo - {petName}</DialogTitle>
            <DialogDescription>Choose a new photo for your pet</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!photo || updatePetPhoto.isPending}>
                {updatePetPhoto.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Update Photo'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddPhotoButton({ petId, petName }: { petId: number; petName: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const updatePetPhoto = useUpdatePetPhoto();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    updatePetPhoto.mutate(
      { petId, photo },
      {
        onSuccess: () => {
          setPhoto(null);
          setShowDialog(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted-foreground/10 hover:bg-muted-foreground/20 transition-colors">
            <Camera className="h-5 w-5" />
            <span className="text-sm font-medium">Add Photo</span>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo - {petName}</DialogTitle>
            <DialogDescription>Choose a photo for your pet</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={!photo || updatePetPhoto.isPending}>
                {updatePetPhoto.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Add Photo'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdoptionListingButton({ petId, petName, isListed }: { petId: number; petName: string; isListed: boolean }) {
  const listPet = useListPetForAdoption();
  const delistPet = useDelistPetFromAdoption();

  const handleToggleListing = () => {
    if (isListed) {
      delistPet.mutate(petId);
    } else {
      listPet.mutate(petId);
    }
  };

  return (
    <Button
      variant={isListed ? 'destructive' : 'default'}
      className="w-full"
      onClick={handleToggleListing}
      disabled={listPet.isPending || delistPet.isPending}
    >
      {listPet.isPending || delistPet.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isListed ? 'Removing...' : 'Listing...'}
        </>
      ) : (
        <>
          <Heart className="mr-2 h-4 w-4" />
          {isListed ? 'Remove from Adoption' : 'List for Adoption'}
        </>
      )}
    </Button>
  );
}









