import { useAuth } from '../hooks/useAuth';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PetsTab from '../components/tabs/PetsTab';
import StrayReportsTab from '../components/tabs/StrayReportsTab';
import AdoptionTab from '../components/tabs/AdoptionTab';
import ShopTab from '../components/tabs/ShopTab';
import AdminTab from '../components/tabs/AdminTab';
import BlogTab from '../components/tabs/BlogTab';
import SettingsTab from '../components/tabs/SettingsTab';
import VaccinationsTab from '../components/tabs/VaccinationsTab';
import { PawPrint, AlertCircle, Heart, ShoppingBag, Shield, MessageSquare, Settings, Syringe } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: userProfile } = useGetCallerUserProfile();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {userProfile?.name || 'User'}!
        </h2>
        <p className="text-muted-foreground">
          Manage your pets, help strays, and explore our services
        </p>
      </div>

      <Tabs defaultValue="pets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:grid-cols-8">
          <TabsTrigger value="pets" className="gap-2">
            <PawPrint className="h-4 w-4" />
            <span className="hidden sm:inline">My Pets</span>
          </TabsTrigger>
          <TabsTrigger value="vaccinations" className="gap-2">
            <Syringe className="h-4 w-4" />
            <span className="hidden sm:inline">Vaccines</span>
          </TabsTrigger>
          <TabsTrigger value="strays" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Strays</span>
          </TabsTrigger>
          <TabsTrigger value="adoption" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Adoption</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Shop</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Blog</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pets" className="space-y-4">
          <PetsTab />
        </TabsContent>

        <TabsContent value="vaccinations" className="space-y-4">
          <VaccinationsTab />
        </TabsContent>

        <TabsContent value="adoption" className="space-y-4">
          <AdoptionTab />
        </TabsContent>

        <TabsContent value="shop" className="space-y-4">
          <ShopTab />
        </TabsContent>

        <TabsContent value="blog" className="space-y-4">
          <BlogTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4">
            <AdminTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

