import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, PawPrint, ShoppingBag, Users } from 'lucide-react';

export default function WelcomeScreen() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Heart className="h-16 w-16 fill-primary text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to PetCare Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your comprehensive platform for pet management, stray animal rescue, and pet care services
          </p>
          <div className="pt-4">
            <Button size="lg" onClick={login} disabled={isLoggingIn}>
              {isLoggingIn ? 'Logging in...' : 'Get Started'}
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <PawPrint className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Pet Management</h3>
              <p className="text-sm text-muted-foreground">
                Track your pets' health records, vaccinations, and medical history
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Stray Rescue</h3>
              <p className="text-sm text-muted-foreground">
                Report and track stray animals in your community
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Adoption</h3>
              <p className="text-sm text-muted-foreground">
                Find your perfect companion through our adoption program
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Pet Supplies</h3>
              <p className="text-sm text-muted-foreground">
                Shop for quality pet food, toys, and accessories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Image Gallery */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <img
            src="/assets/generated/vet-examination.dim_800x600.jpg"
            alt="Veterinary examination"
            className="rounded-lg object-cover w-full h-48"
          />
          <img
            src="/assets/generated/pet-adoption-family.dim_800x600.jpg"
            alt="Pet adoption"
            className="rounded-lg object-cover w-full h-48"
          />
          <img
            src="/assets/generated/pet-supplies-shelf.dim_800x600.jpg"
            alt="Pet supplies"
            className="rounded-lg object-cover w-full h-48"
          />
        </div>
      </div>
    </div>
  );
}

