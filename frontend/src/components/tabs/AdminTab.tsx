import { useState } from 'react';
import {
  useListProducts,
  useAddProduct,
  useUpdateProduct,
  useListOrders,
  useUpdateOrderStatus,
  useListAdoptionRecords,
  useUpdateAdoptionStatus,
} from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Package, ShoppingBag, Heart } from 'lucide-react';
import type { Product, Order, AdoptionRecord } from '../../types';

export default function AdminTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Admin Dashboard</h3>
        <p className="text-muted-foreground">Manage products, orders, and adoptions</p>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="adoptions" className="gap-2">
            <Heart className="h-4 w-4" />
            Adoptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsManagement />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersManagement />
        </TabsContent>

        <TabsContent value="adoptions">
          <AdoptionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsManagement() {
  const { data: products, isLoading } = useListProducts();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <ProductForm onSuccess={() => setShowAddProduct(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">${product.price}</span>
                <Badge>{product.stock} in stock</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditingProduct(product)}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent>
            <ProductForm
              product={editingProduct}
              onSuccess={() => setEditingProduct(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProductForm({ product, onSuccess }: { product?: Product; onSuccess: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [stock, setStock] = useState(product?.stock.toString() || '');
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description,
      price: parseInt(price),
      stock: parseInt(stock),
    };

    if (product) {
      updateProduct.mutate({ id: product.id, ...data }, { onSuccess });
    } else {
      addProduct.mutate(data, { onSuccess });
    }
  };

  const isPending = addProduct.isPending || updateProduct.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogDescription>
          {product ? 'Update product information' : 'Add a new product to the store'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">Name</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-description">Description</Label>
          <Textarea
            id="product-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-price">Price ($)</Label>
            <Input
              id="product-price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-stock">Stock</Label>
            <Input
              id="product-stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {product ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            product ? 'Update Product' : 'Add Product'
          )}
        </Button>
      </form>
    </>
  );
}

function OrdersManagement() {
  const { data: orders, isLoading } = useListOrders();
  const updateStatus = useUpdateOrderStatus();
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatus.mutate(
      { id: orderId, status: status as any },
      {
        onSuccess: () => setUpdatingOrder(null),
      }
    );
  };

  return (
    <div className="space-y-4">
      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>
                    {order.products.length} items • Total: ${order.total}
                  </CardDescription>
                </div>
                <Badge>
                  {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                {order.products.map((product, idx) => (
                  <p key={idx} className="text-sm">
                    {product.name} - ${product.price}
                  </p>
                ))}
              </div>
              {updatingOrder === order.id ? (
                <Select onValueChange={(value) => handleStatusUpdate(order.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpdatingOrder(order.id)}
                >
                  Update Status
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdoptionsManagement() {
  const { data: adoptions, isLoading } = useListAdoptionRecords();
  const updateStatus = useUpdateAdoptionStatus();
  const [updatingAdoption, setUpdatingAdoption] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (adoptionId: number, status: string) => {
    updateStatus.mutate(
      { id: adoptionId, status: status as any },
      {
        onSuccess: () => setUpdatingAdoption(null),
      }
    );
  };

  return (
    <div className="space-y-4">
      {adoptions && adoptions.length > 0 ? (
        adoptions.map((adoption) => (
          <Card key={adoption.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Adoption Request #{adoption.id}</CardTitle>
                  <CardDescription>Pet ID: {adoption.petId}</CardDescription>
                </div>
                <Badge>
                  {adoption.status.charAt(0) + adoption.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {updatingAdoption === adoption.id ? (
                <Select onValueChange={(value) => handleStatusUpdate(adoption.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpdatingAdoption(adoption.id)}
                >
                  Update Status
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No adoption requests yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

