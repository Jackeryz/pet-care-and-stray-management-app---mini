import { useState } from 'react';
import { useListPets, useCreatePet, useGetMedicalRecord, useAddMedicalRecord } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Syringe, FileText } from 'lucide-react';
import type { Pet } from '../../backend';

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
            <Card key={pet.id} className="overflow-hidden">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={URL.createObjectURL(new Blob([new Uint8Array(pet.photo)], { type: 'image/jpeg' }))}
                  alt={pet.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle>{pet.name}</CardTitle>
                <CardDescription>
                  {pet.breed} • {pet.age} years old
                </CardDescription>
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
  const [age, setAge] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const createPet = useCreatePet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    const arrayBuffer = await photo.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    createPet.mutate(
      {
        name,
        breed,
        age: parseInt(age),
        photo: uint8Array,
      },
      {
        onSuccess,
      }
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
          <Label htmlFor="age">Age (years)</Label>
          <Input
            id="age"
            type="number"
            min="0"
            placeholder="e.g., 3"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </div>
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

      <div className="space-y-4">
        {medicalRecord ? (
          <>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Vaccinations
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

