import React from 'react';
import { useGetCallerUserProfile, useDeleteAccount } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UsernameEditor from '../UsernameEditor';
import LocationEditor from '../LocationEditor';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function SettingsTab() {
  const { data: userData } = useGetCallerUserProfile();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeleteAccount = () => {
    if (emailConfirmation.trim() === userData?.email) {
      deleteAccount();
      setShowDeleteDialog(false);
      setEmailConfirmation('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Username Section */}
      <div>
        <UsernameEditor />
      </div>

      {/* Location Section (for VETs and NGOs) */}
      {(userData?.role === 'VET' || userData?.role === 'NGO') && (
        <div>
          <LocationEditor />
        </div>
      )}

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

      {/* Delete Account Section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-lg text-red-900">Danger Zone</CardTitle>
          <CardDescription className="text-red-800">Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-900">Delete Account</h3>
              <p className="text-sm text-red-800">Permanently delete your account and all associated data</p>
            </div>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account?</DialogTitle>
            <DialogDescription>
              <div className="space-y-4 mt-4">
                <div>
                  <p className="font-semibold mb-2">⚠️ This action is irreversible!</p>
                  <p>When you delete your account, the following will be permanently deleted:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Your profile and all account information</li>
                    <li>All your pets and their medical records</li>
                    <li>All adoption requests and chat histories</li>
                    <li>All stray reports you submitted</li>
                    <li>Your orders and transaction history</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium text-foreground">To confirm, please type your email:</p>
                  <Input
                    value={emailConfirmation}
                    onChange={(e) => setEmailConfirmation(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={emailConfirmation.trim() !== userData?.email || isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
