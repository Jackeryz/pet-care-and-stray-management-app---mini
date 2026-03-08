import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, PawPrint, ShoppingBag, Users, MapPin, Loader2, Eye, EyeOff } from 'lucide-react';
import MapPicker from '@/components/MapPicker';
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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

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

  const trimmedUsername = username.trim();
  const usernameFormatOk = /^[a-zA-Z0-9_-]{3,20}$/.test(trimmedUsername);
  const shouldCheckAvailability = mode === 'register' && trimmedUsername.length > 0 && usernameFormatOk;

  useEffect(() => {
    if (!shouldCheckAvailability) {
      if (!trimmedUsername) {
        setUsernameAvailability({ status: 'idle', message: '' });
      } else if (trimmedUsername.length < 3) {
        setUsernameAvailability({ status: 'error', message: 'Too short (minimum 3 characters)' });
      } else if (trimmedUsername.length > 20) {
        setUsernameAvailability({ status: 'error', message: 'Too long (maximum 20 characters)' });
      } else {
        setUsernameAvailability({ status: 'error', message: 'Only alphanumeric, dash, and underscore allowed' });
      }
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setUsernameAvailability({ status: 'checking', message: 'Checking availability...' });

      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmedUsername)}`);
        const body = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setUsernameAvailability({ status: 'error', message: body.error || 'Unable to verify username right now' });
          return;
        }

        if (body.available) {
          setUsernameAvailability({ status: 'available', message: 'Username is available' });
        } else {
          setUsernameAvailability({ status: 'taken', message: 'Username is already taken' });
        }
      } catch (_error) {
        if (!cancelled) {
          setUsernameAvailability({ status: 'error', message: 'Unable to verify username right now' });
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUsername, shouldCheckAvailability]);

  const usernameBlocksSubmit =
    mode === 'register' &&
    !!trimmedUsername &&
    (usernameAvailability.status === 'checking' ||
      usernameAvailability.status === 'taken' ||
      usernameAvailability.status === 'error');

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Heart className="h-16 w-16 fill-primary text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Welcome to PetCare Hub</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your comprehensive platform for pet management, stray animal rescue, and pet care services
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-center gap-4">
              <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>
                Login
              </Button>
              <Button variant={mode === 'register' ? 'default' : 'outline'} onClick={() => setMode('register')}>
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
                  await register(name, email, password, role as Role, latitude, longitude, trimmedUsername || undefined);
                }
              }}
            >
              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">I am a...</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PET_OWNER">Pet Owner</SelectItem>
                        <SelectItem value="VET">Veterinarian</SelectItem>
                        <SelectItem value="NGO">NGO / Rescue Organization</SelectItem>
                        <SelectItem value="FARMER">Farmer</SelectItem>
                        <SelectItem value="PUBLIC_USER">Public User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(role === 'VET' || role === 'NGO') && (
                    <div className="space-y-2">
                      <Label>{role === 'VET' ? 'Clinic Location' : 'Organization Location'}</Label>
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowMapPicker(true)}
                        className="w-full mt-2"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Pick Location on Map
                      </Button>
                      {latitude && longitude && (
                        <p className="text-xs text-muted-foreground">
                          Location set: {latitude.toFixed(4)} deg, {longitude.toFixed(4)} deg
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
                    {trimmedUsername && (
                      <p
                        className={`text-xs ${
                          usernameAvailability.status === 'available'
                            ? 'text-green-600'
                            : usernameAvailability.status === 'checking'
                              ? 'text-muted-foreground'
                              : 'text-red-600'
                        }`}
                      >
                        {usernameAvailability.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isAuthenticating || usernameBlocksSubmit}>
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

        <MapPicker
          open={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onPick={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

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
              <p className="text-sm text-muted-foreground">Report and track stray animals in your community</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Adoption</h3>
              <p className="text-sm text-muted-foreground">Find your perfect companion through our adoption program</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="flex justify-center">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold">Pet Supplies</h3>
              <p className="text-sm text-muted-foreground">Shop for quality pet food, toys, and accessories</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
