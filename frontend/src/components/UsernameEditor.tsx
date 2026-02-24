import React, { useState } from 'react';
import { Loader2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateUsername, useGetCallerUserProfile } from '../hooks/useQueries';
import { toast } from 'sonner';

export default function UsernameEditor() {
  const { data: userData } = useGetCallerUserProfile();
  const updateUsername = useUpdateUsername();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(userData?.username || '');
  const [error, setError] = useState('');

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username must be at most 20 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Only alphanumeric, dash, and underscore allowed';
    }
    if (username === userData?.username) {
      return 'New username must be different from current one';
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validateUsername(newUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateUsername.mutate(newUsername, {
      onSuccess: () => {
        setIsEditing(false);
        setNewUsername(userData?.username || '');
        setError('');
      },
      onError: (error: any) => {
        const message = error.message || 'Failed to update username';
        if (message.includes('7 days')) {
          setError(message);
        } else {
          setError(message);
        }
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewUsername(userData?.username || '');
    setError('');
  };

  const isUsernameValid = /^[a-zA-Z0-9_-]{3,20}$/.test(newUsername) && newUsername !== userData?.username;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Username</CardTitle>
        <CardDescription>Your unique identifier for the community</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{userData?.username || 'Not set'}</p>
              <p className="text-sm text-muted-foreground mt-1">Used in blog posts and community activities</p>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Username</label>
              <Input
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setError('');
                }}
                placeholder="3-20 characters (alphanumeric, dash, underscore)"
                className={error ? 'border-red-500' : ''}
              />
            </div>

            {/* Validation feedback */}
            {newUsername && (
              <div className="text-sm">
                {newUsername.length < 3 && <p className="text-yellow-600">❌ Too short (minimum 3 characters)</p>}
                {newUsername.length > 20 && <p className="text-yellow-600">❌ Too long (maximum 20 characters)</p>}
                {newUsername === userData?.username && <p className="text-yellow-600">❌ Must be different from current username</p>}
                {newUsername.length >= 3 && newUsername.length <= 20 && !/^[a-zA-Z0-9_-]+$/.test(newUsername) && (
                  <p className="text-yellow-600">❌ Only alphanumeric, dash, and underscore allowed</p>
                )}
                {isUsernameValid && <p className="text-green-600">✓ Username looks good</p>}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">
              💡 You can change your username once every 7 days
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!isUsernameValid || updateUsername.isPending}
                className="gap-2"
              >
                {updateUsername.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Check className="h-4 w-4" />
                Save
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
