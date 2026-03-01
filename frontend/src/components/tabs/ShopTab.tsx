import { useMemo, useState } from 'react';
import { ExternalLink, Search, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const AMAZON_BASE = 'https://www.amazon.com/s?k=';

const petProductBuckets = [
  {
    title: 'Dog Essentials',
    description: 'Food, leash, bowls, and training must-haves for dogs.',
    keywords: ['dog food', 'dog leash', 'dog bowl', 'dog training treats'],
  },
  {
    title: 'Cat Essentials',
    description: 'Litter care, toys, scratching, and feeding products for cats.',
    keywords: ['cat litter', 'cat scratching post', 'cat toy', 'cat food bowl'],
  },
  {
    title: 'Pet Health & Grooming',
    description: 'Daily care products for grooming, hygiene, and first aid.',
    keywords: ['pet grooming kit', 'dog shampoo', 'pet dental care', 'pet first aid kit'],
  },
  {
    title: 'Travel & Comfort',
    description: 'Carriers, travel accessories, beds, and calming products.',
    keywords: ['pet carrier', 'dog car seat cover', 'orthopedic dog bed', 'calming pet bed'],
  },
];

function amazonSearchUrl(query: string) {
  return `${AMAZON_BASE}${encodeURIComponent(query)}`;
}

function openAmazon(query: string) {
  window.open(amazonSearchUrl(query), '_blank', 'noopener,noreferrer');
}

export default function ShopTab() {
  const [search, setSearch] = useState('pet supplies');

  const quickTags = useMemo(
    () => ['pet', 'dog', 'cat', 'pet toys', 'pet food', 'pet grooming', 'pet beds'],
    [],
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shop Pet Products on Amazon
          </CardTitle>
          <CardDescription>
            Search pet-related products and open Amazon product listings directly in a new tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try: dog food, cat litter, pet carrier"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (search.trim()) openAmazon(search.trim());
                }
              }}
            />
            <Button
              type="button"
              onClick={() => search.trim() && openAmazon(search.trim())}
              disabled={!search.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Search Amazon
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <Button key={tag} type="button" variant="outline" size="sm" onClick={() => openAmazon(tag)}>
                #{tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Popular Pet Shopping Categories</h3>
          <p className="text-muted-foreground">Use common pet tags and jump to Amazon results instantly.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {petProductBuckets.map((bucket) => (
            <Card key={bucket.title}>
              <CardHeader>
                <CardTitle>{bucket.title}</CardTitle>
                <CardDescription>{bucket.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {bucket.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => openAmazon(keyword)}>
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full" onClick={() => openAmazon(bucket.keywords.join(' '))}>
                  View on Amazon
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
