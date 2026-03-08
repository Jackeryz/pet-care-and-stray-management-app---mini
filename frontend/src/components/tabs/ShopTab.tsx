import { useMemo, useState } from 'react';
import { ExternalLink, Search, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const AMAZON_BASE = 'https://www.amazon.com/s?k=';
const BLINKIT_BASE = 'https://blinkit.com/s/?q=';

const essentialTerms = [
  'food',
  'litter',
  'washroom',
  'toilet',
  'hygiene',
  'shampoo',
  'cleaner',
  'wipes',
  'pee',
  'poop',
  'pads',
];

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

function blinkitSearchUrl(query: string) {
  return `${BLINKIT_BASE}${encodeURIComponent(query)}`;
}

function isEssentialQuery(query: string) {
  const normalized = query.toLowerCase();
  return essentialTerms.some((term) => normalized.includes(term));
}

function getShopUrl(query: string) {
  return isEssentialQuery(query) ? blinkitSearchUrl(query) : amazonSearchUrl(query);
}

function openShop(query: string) {
  window.open(getShopUrl(query), '_blank', 'noopener,noreferrer');
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
            Shop Pet Products
          </CardTitle>
          <CardDescription>
            Essential items (food, litter, hygiene, washroom products) open on Blinkit for faster delivery.
            Other products open on Amazon.
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
                  if (search.trim()) openShop(search.trim());
                }
              }}
            />
            <Button
              type="button"
              onClick={() => search.trim() && openShop(search.trim())}
              disabled={!search.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Search Store
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <Button key={tag} type="button" variant="outline" size="sm" onClick={() => openShop(tag)}>
                #{tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Popular Pet Shopping Categories</h3>
          <p className="text-muted-foreground">Essentials auto-route to Blinkit; non-essentials go to Amazon.</p>
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
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => openShop(keyword)}>
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full" onClick={() => openShop(bucket.keywords.join(' '))}>
                  View Products
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
