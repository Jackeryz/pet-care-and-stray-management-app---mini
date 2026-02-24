import React, { useState } from 'react';
import { useGetBlogPosts, useCreateBlogPost, useGetCallerUserProfile } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  PET_OWNER: 'bg-blue-100 text-blue-800',
  VET: 'bg-green-100 text-green-800',
  NGO: 'bg-purple-100 text-purple-800',
  PUBLIC: 'bg-gray-100 text-gray-800',
};

export default function BlogTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const [newPostContent, setNewPostContent] = useState('');
  const { data: userData } = useGetCallerUserProfile();
  const { data: blogData, isLoading } = useGetBlogPosts(currentPage);
  const createPost = useCreateBlogPost();

  const handleCreatePost = () => {
    if (newPostContent.trim().length === 0) {
      toast.error('Please write something before posting');
      return;
    }

    createPost.mutate(newPostContent, {
      onSuccess: () => {
        setNewPostContent('');
        setCurrentPage(1);
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCreatePost();
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Please log in to view and create posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Create Post Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Share Your Thoughts & Experiences</CardTitle>
          <CardDescription>Everyone will see your post. You'll be identified by your unique username.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your experience, tips, or thoughts about pet care, adoption, or stray animals..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={5}
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {newPostContent.length}/5000 characters
            </p>
            <Button
              onClick={handleCreatePost}
              disabled={createPost.isPending || newPostContent.trim().length === 0}
              className="gap-2"
            >
              {createPost.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            💡 Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to quickly post your message
          </p>
        </CardContent>
      </Card>

      {/* Blog Posts Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Community Posts</h3>
          <p className="text-muted-foreground">Experiences and thoughts from our community</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : blogData?.posts && blogData.posts.length > 0 ? (
          <div className="space-y-4">
            {blogData.posts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">{post.username}</span>
                        <Badge
                          variant="secondary"
                          className={`${roleColors[post.role] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {post.role.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <CardDescription>
                        {new Date(post.createdAt).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">{post.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {blogData && (blogData.posts.length > 0 || currentPage > 1) && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm font-medium px-4">Page {currentPage}</span>

            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!blogData.hasMore}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
