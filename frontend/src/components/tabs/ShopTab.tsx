import { useState } from 'react';
import { useListProducts, useCreateOrder, useListOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart, Package } from 'lucide-react';
import type { Product, Order } from '../../backend';

export default function ShopTab() {
  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: orders, isLoading: ordersLoading } = useListOrders();
  const [cart, setCart] = useState<number[]>([]);
  const createOrder = useCreateOrder();

  const isLoading = productsLoading || ordersLoading;

  const addToCart = (productId: number) => {
    setCart([...cart, productId]);
  };

  const removeFromCart = (productId: number) => {
    const index = cart.indexOf(productId);
    if (index > -1) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, productId) => {
      const product = products?.find(p => p.id === productId);
      return total + (product?.price || 0);
    }, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createOrder.mutate(cart, {
      onSuccess: () => setCart([]),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shopping Cart */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Array.from(new Set(cart)).map(productId => {
                const product = products?.find(p => p.id === productId);
                const quantity = cart.filter(id => id === productId).length;
                if (!product) return null;
                return (
                  <div key={productId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${product.price} × {quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(productId)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToCart(productId)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="flex items-center justify-between font-bold">
              <span>Total:</span>
              <span>${getCartTotal()}</span>
            </div>
            <Button
              className="w-full"
              onClick={handleCheckout}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Checkout'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Pet Supplies</h3>
          <p className="text-muted-foreground">Quality products for your beloved pets</p>
        </div>

        {products && products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => addToCart(product.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <img
                src="/assets/generated/pet-supplies-shelf.dim_800x600.jpg"
                alt="Pet supplies"
                className="w-64 h-48 object-cover rounded-lg mb-4"
              />
              <p className="text-muted-foreground">No products available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* My Orders */}
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">My Orders</h3>
          <p className="text-muted-foreground">Track your order history</p>
        </div>

        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No orders yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${product.price}</span>
          <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </Badge>
        </div>
        <Button
          className="w-full"
          onClick={onAddToCart}
          disabled={product.stock === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order }: { order: Order }) {
  const getStatusBadge = (status: any) => {
    const statusKey = Object.keys(status)[0];
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      shipped: 'default',
      delivered: 'outline',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[statusKey] || 'secondary'}>
        {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Order #{order.id}</CardTitle>
            <CardDescription>{order.products.length} items</CardDescription>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          {order.products.map((product, idx) => (
            <p key={idx} className="text-sm">
              {product.name} - ${product.price}
            </p>
          ))}
        </div>
        <Separator />
        <div className="flex items-center justify-between font-bold">
          <span>Total:</span>
          <span>${order.total}</span>
        </div>
      </CardContent>
    </Card>
  );
}

