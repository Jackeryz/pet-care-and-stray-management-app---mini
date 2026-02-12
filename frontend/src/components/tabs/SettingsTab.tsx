import React from 'react';
import { useGetCallerUserProfile } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UsernameEditor from '../UsernameEditor';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SettingsTab() {
  const { data: userData } = useGetCallerUserProfile();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Username Section */}
      <div>
        <UsernameEditor />
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-semibold">{userData?.name}</p>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Email</p>
              <div className="flex items-center justify-between">
                <p className="font-semibold break-all">{userData?.email}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(userData?.email || '', 'email')}
                >
                  {copiedField === 'email' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="secondary" className="w-fit">
                {userData?.role.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Account ID</p>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs break-all">{userData?.id?.slice(0, 12)}...</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(userData?.id || '', 'id')}
                >
                  {copiedField === 'id' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">About Usernames</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <p>
            • Your <strong>username</strong> is how other community members see you in blog posts and discussions
          </p>
          <p>
            • Your <strong>real name</strong> is kept private and only visible to people you interact with directly (like in adoption chats)
          </p>
          <p>
            • You can change your username <strong>once every 7 days</strong>
          </p>
          <p>
            • If you didn't set a username during registration, one was auto-generated for you
          </p>
          <p>
            • Usernames must be <strong>3-20 characters</strong> and can only contain letters, numbers, dashes, and underscores
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
