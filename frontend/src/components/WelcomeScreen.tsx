import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, PawPrint, ShoppingBag, Users, MapPin, Loader2 } from 'lucide-react';
import type { Role } from '../types';

export default function WelcomeScreen() {
  const { login, register, status } = useAuth();
  const isAuthenticating = status === 'authenticating';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('PUBLIC_USER');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleGetLocation = async () => {
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch (error) {
      console.error('Geolocation error:', error);
    } finally {
      setGeoLoading(false);
    }
  };

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
        </div>

        {/* Auth Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-center gap-4">
              <Button
                variant={mode === 'login' ? 'default' : 'outline'}
                onClick={() => setMode('login')}
              >
                Login
              </Button>
              <Button
                variant={mode === 'register' ? 'default' : 'outline'}
                onClick={() => setMode('register')}
              >
                Register
              </Button>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (mode === 'login') {
                  await login(email, password);
                } else {
                  await register(name, email, password, role as Role, latitude, longitude, username || undefined);
                }
              }}
            >
              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">I am a...</Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as Role)}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PET_OWNER">Pet Owner</SelectItem>
                        <SelectItem value="VET">Veterinarian</SelectItem>
                        <SelectItem value="NGO">NGO / Rescue Organization</SelectItem>
                        <SelectItem value="PUBLIC_USER">Public User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {role === 'NGO' && (
                    <div className="space-y-2">
                      <Label>Organization Location</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGetLocation}
                        disabled={geoLoading}
                        className="w-full"
                      >
                        {geoLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting location...
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Use My Location
                          </>
                        )}
                      </Button>
                      {latitude && longitude && (
                        <p className="text-xs text-muted-foreground">
                          Location set: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (Optional - auto-generated if not provided)</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="3-20 characters (alphanumeric, dash, underscore)"
                      pattern="^[a-zA-Z0-9_-]{3,20}$"
                    />
                    {username && (
                      <p className="text-xs text-muted-foreground">
                        {username.length < 3 && '❌ Too short (minimum 3 characters)'}
                        {username.length > 20 && '❌ Too long (maximum 20 characters)'}
                        {username.length >= 3 && username.length <= 20 && !!/^[a-zA-Z0-9_-]+$/.test(username) && '✓ Username looks good'}
                        {username.length >= 3 && username.length <= 20 && !/^[a-zA-Z0-9_-]+$/.test(username) && '❌ Only alphanumeric, dash, and underscore allowed'}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isAuthenticating}>
                {isAuthenticating
                  ? mode === 'login'
                    ? 'Logging in...'
                    : 'Registering...'
                  : mode === 'login'
                    ? 'Login'
                    : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>

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

