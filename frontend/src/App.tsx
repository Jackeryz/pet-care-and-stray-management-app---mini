import { useAuth } from './hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';
import WelcomeScreen from './components/WelcomeScreen';

export default function App() {
  const { user, status } = useAuth();

  const isAuthenticated = !!user;
  const isInitializing = status === 'initializing' || status === 'authenticating';

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Initializing...</p>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          {isAuthenticated ? <Dashboard /> : <WelcomeScreen />}
        </main>
        <Footer />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

