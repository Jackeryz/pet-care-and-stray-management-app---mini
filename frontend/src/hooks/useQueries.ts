import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, getApiBaseUrl, getAuthToken, useAuth } from './useAuth';
import type {
  UserProfile,
  Pet,
  MedicalRecord,
  StrayReport,
  AdoptionRecord,
  Product,
  Order,
  ReportStatus,
  AdoptionStatus,
  OrderStatus,
} from '../types';

// ------------- Auth / Profile -------------

export function useGetCallerUserProfile() {
  const { user, status } = useAuth();

  const isLoading = status === 'initializing' || status === 'authenticating';
  const isFetched = !isLoading;

  return {
    data: user as UserProfile | null,
    isLoading,
    isFetched,
  };
}

// Profile editing is not yet implemented in the Node backend.
// This hook exists to keep the API surface compatible but will error if used.
export function useSaveCallerUserProfile() {
  return useMutation({
    mutationFn: async (_profile: UserProfile) => {
      throw new Error('Profile editing is not implemented yet.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Profile editing is not implemented yet.');
    },
  });
}

// ------------- Pets & Medical Records -------------

export function useListPets() {
  return useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: async () => {
      return apiFetch<Pet[]>('/api/pets');
    },
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      breed,
      age,
      photo,
    }: {
      name: string;
      breed: string;
      age: number;
      photo?: File | null;
    }) => {
      const baseUrl = getApiBaseUrl();
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('name', name);
      formData.append('breed', breed);
      formData.append('age', String(age));
      if (photo) formData.append('photo', photo);

      const res = await fetch(`${baseUrl}/api/pets`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create pet');
      }

      return (await res.json()) as Pet;
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

export function useDeletePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (petId: number) => {
      return apiFetch<{ message: string }>(`/api/pets/${petId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      toast.success('Pet deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete pet');
    },
  });
}

export function useAddMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      petId,
      vaccinations,
      treatments,
    }: {
      petId: number;
      vaccinations: string[];
      treatments: string[];
    }) => {
      return apiFetch<MedicalRecord>('/api/pets/medical', {
        method: 'POST',
        body: JSON.stringify({ petId, vaccinations, treatments }),
      });
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
  return useQuery<MedicalRecord | null>({
    queryKey: ['medicalRecords', petId],
    queryFn: async () => {
      if (petId === null) return null;
      try {
        return await apiFetch<MedicalRecord>(`/api/pets/${petId}/medical`);
      } catch {
        return null;
      }
    },
    enabled: petId !== null,
  });
}

// ------------- Stray Reports -------------

export function useListStrayReports() {
  return useQuery<StrayReport[]>({
    queryKey: ['strayReports'],
    queryFn: async () => {
      const raw = await apiFetch<any[]>('/api/strays');
      // Map backend shape to frontend type
      return raw.map((r) => ({
        id: r.id,
        location: r.location,
        description: r.description,
        photoUrl: r.photoUrl ?? null,
        status: r.status as ReportStatus,
        createdAt: r.createdAt,
        reporterName: r.reporter?.name,
      })) as StrayReport[];
    },
  });
}

export function useGetUserStrayReports() {
  return useQuery<StrayReport[]>({
    queryKey: ['userStrayReports'],
    queryFn: async () => {
      const raw = await apiFetch<any[]>('/api/strays/my-reports');
      // Map backend shape to frontend type
      return raw.map((r) => ({
        id: r.id,
        location: r.location,
        description: r.description,
        photoUrl: r.photoUrl ?? null,
        status: r.status as ReportStatus,
        createdAt: r.createdAt,
        reporterName: r.reporter?.name,
      })) as StrayReport[];
    },
  });
}

export function useReportStray() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      location,
      photo,
      description,
      latitude,
      longitude,
    }: {
      location: string;
      photo: File;
      description: string;
      latitude?: number | null;
      longitude?: number | null;
    }) => {
      const baseUrl = getApiBaseUrl();
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('location', location);
      formData.append('description', description);
      formData.append('photo', photo);
      if (latitude) formData.append('latitude', String(latitude));
      if (longitude) formData.append('longitude', String(longitude));

      const res = await fetch(`${baseUrl}/api/strays`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to submit report');
      }

      return (await res.json()) as StrayReport;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReportStatus }) => {
      return apiFetch<StrayReport>(`/api/strays/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
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

// ------------- Adoption -------------

export function useListAdoptionRecords() {
  const { user } = useAuth();

  return useQuery<AdoptionRecord[]>({
    queryKey: ['adoptionRecords'],
    queryFn: async () => {
      const endpoint = user?.role === 'ADMIN' ? '/api/adoptions/all' : '/api/adoptions';
      const raw = await apiFetch<any[]>(endpoint);
      return raw.map(
        (r) =>
          ({
            id: r.id,
            petId: r.petId,
            status: r.status,
          }) as AdoptionRecord,
      );
    },
    enabled: !!user,
  });
}

export function useCreateAdoptionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (petId: number) => {
      return apiFetch<AdoptionRecord>('/api/adoptions', {
        method: 'POST',
        body: JSON.stringify({ petId }),
      });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: AdoptionStatus }) => {
      return apiFetch<AdoptionRecord>(`/api/adoptions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
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

// ------------- Chat Messages (Adoption) -------------

export function useGetChatMessages(adoptionRecordId: number) {
  return useQuery<any[]>({
    queryKey: ['chatMessages', adoptionRecordId],
    queryFn: async () => {
      return apiFetch<any[]>(`/api/chat/${adoptionRecordId}`);
    },
    enabled: !!adoptionRecordId,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adoptionRecordId,
      message,
    }: {
      adoptionRecordId: number;
      message: string;
    }) => {
      return apiFetch<any>(`/api/chat/${adoptionRecordId}/send`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['chatMessages', variables.adoptionRecordId],
      });
      queryClient.invalidateQueries({ queryKey: ['unreadChatCount'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useGetUnreadChatCount() {
  return useQuery<{ totalUnread: number; adoptionUnreadCounts: Record<string, number> }>({
    queryKey: ['unreadChatCount'],
    queryFn: async () => {
      return apiFetch('/api/chat/count/unread');
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// ------------- Products & Orders -------------

export function useListProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      return apiFetch<Product[]>('/api/shop/products');
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      price,
      stock,
    }: {
      name: string;
      description: string;
      price: number;
      stock: number;
    }) => {
      return apiFetch<Product>('/api/shop/products', {
        method: 'POST',
        body: JSON.stringify({ name, description, price, stock }),
      });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      price,
      stock,
    }: {
      id: number;
      name: string;
      description: string;
      price: number;
      stock: number;
    }) => {
      // Simple implementation: treat as full update endpoint
      return apiFetch<Product>(`/api/shop/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description, price, stock }),
      });
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

export function useListOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const raw = await apiFetch<any[]>('/api/shop/orders');
      return raw.map(
        (o) =>
          ({
            id: o.id,
            total: o.total,
            status: o.status as OrderStatus,
            createdAt: o.createdAt,
            products: (o.items || []).map((item: any) => ({
              id: item.product.id,
              name: item.product.name,
              description: item.product.description,
              price: item.product.price,
            })),
          }) as Order,
      );
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds: number[]) => {
      return apiFetch<Order>('/api/shop/orders', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OrderStatus }) => {
      return apiFetch<Order>(`/api/shop/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
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

