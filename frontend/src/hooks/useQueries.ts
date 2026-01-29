import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Pet, StrayReport, AdoptionRecord, Product, Order, MedicalRecord, Role, ReportStatus, AdoptionStatus, OrderStatus } from '../backend';
import { toast } from 'sonner';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save profile');
    },
  });
}

// Pet Queries
export function useListPets() {
  const { actor, isFetching } = useActor();

  return useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, breed, age, photo }: { name: string; breed: string; age: number; photo: Uint8Array }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPet(name, breed, age, photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      toast.success('Pet added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add pet');
    },
  });
}

export function useAssignVetToPet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, vetPrincipal }: { petId: number; vetPrincipal: string }) => {
      if (!actor) throw new Error('Actor not available');
      const { Principal } = await import('@dfinity/principal');
      return actor.assignVetToPet(petId, Principal.fromText(vetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      toast.success('Veterinarian assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign veterinarian');
    },
  });
}

// Medical Records
export function useAddMedicalRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, vaccinations, treatments }: { petId: number; vaccinations: string[]; treatments: string[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMedicalRecord(petId, vaccinations, treatments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
      toast.success('Medical record added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add medical record');
    },
  });
}

export function useGetMedicalRecord(petId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery<MedicalRecord | null>({
    queryKey: ['medicalRecords', petId],
    queryFn: async () => {
      if (!actor || petId === null) return null;
      try {
        return await actor.getMedicalRecord(petId);
      } catch (error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching && petId !== null,
  });
}

// Stray Reports
export function useListStrayReports() {
  const { actor, isFetching } = useActor();

  return useQuery<StrayReport[]>({
    queryKey: ['strayReports'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listStrayReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReportStray() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ location, photo, description }: { location: string; photo: Uint8Array; description: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reportStray(location, photo, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strayReports'] });
      toast.success('Stray report submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit report');
    },
  });
}

export function useUpdateReportStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReportStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateReportStatus(id, { [status]: null } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strayReports'] });
      toast.success('Report status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

// Adoption Records
export function useListAdoptionRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<AdoptionRecord[]>({
    queryKey: ['adoptionRecords'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAdoptionRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAdoptionRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (petId: number) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createAdoptionRequest(petId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoptionRecords'] });
      toast.success('Adoption request submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit adoption request');
    },
  });
}

export function useUpdateAdoptionStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: AdoptionStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateAdoptionStatus(id, { [status]: null } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoptionRecords'] });
      toast.success('Adoption status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update adoption status');
    },
  });
}

// Products
export function useListProducts() {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, price, stock }: { name: string; description: string; price: number; stock: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProduct(name, description, price, stock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add product');
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, price, stock }: { id: number; name: string; description: string; price: number; stock: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProduct(id, name, description, price, stock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

// Orders
export function useListOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds: number[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(new Uint32Array(productIds));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order placed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to place order');
    },
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OrderStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateOrderStatus(id, { [status]: null } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
}

// Admin check
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

