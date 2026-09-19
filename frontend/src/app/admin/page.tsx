'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Building2 } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Order {
  id: string;
  orderNumber: string;
  companyName: string;
  status: string;
  total: number;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingCompanies: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    pendingCompanies: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      // Fetch orders, products and pending companies in parallel
      const [ordersRes, productsRes, companiesRes] = await Promise.all([
        fetch(`${API_URL}/checkout/orders`, { headers: authHeaders }),
        fetch(`${API_URL}/products?inStock=false`),
        fetch(`${API_URL}/companies?status=pending`, { headers: authHeaders }),
      ]);

      let totalOrders = 0;
      let pendingOrders = 0;
      let orders: Order[] = [];

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        orders = ordersData.orders || [];
        totalOrders = orders.length;
        pendingOrders = orders.filter((o: Order) => o.status === 'pending').length;
      }

      let totalProducts = 0;
      let lowStockProducts = 0;

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = productsData.products || [];
        totalProducts = products.length;
        lowStockProducts = products.filter((p: any) => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
      }

      let pendingCompanies = 0;
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        pendingCompanies = companiesData.total || 0;
      }

      setStats({ totalOrders, pendingOrders, totalProducts, lowStockProducts, pendingCompanies });
      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Commandes totales',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      href: '/admin/commandes',
    },
    {
      name: 'En attente',
      value: stats.pendingOrders,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      href: '/admin/commandes',
    },
    {
      name: 'Comptes à valider',
      value: stats.pendingCompanies,
      icon: Building2,
      color: 'bg-indigo-500',
      href: '/admin/entreprises',
    },
    {
      name: 'Produits',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-green-500',
      href: '/admin/stocks',
    },
    {
      name: 'Stock faible',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      href: '/admin/stocks',
    },
  ];

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-800 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-warm-600">{stat.name}</p>
                {loading ? (
                  <div className="h-8 w-12 bg-warm-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-warm-800">{stat.value}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-800">Dernières commandes</h2>
            <Link href="/admin/commandes" className="text-sm text-prairie-600 hover:underline">
              Voir tout
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-warm-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-warm-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune commande pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/admin/commandes"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-warm-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-warm-800">{order.orderNumber}</p>
                    <p className="text-sm text-warm-500">{order.companyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-warm-800">{formatPrice(order.total)}</p>
                    <p className="text-xs text-warm-500">{statusLabels[order.status] || order.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-warm-800 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link
              href="/admin/commandes"
              className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Gérer les commandes</span>
                {stats.pendingOrders > 0 && (
                  <p className="text-sm text-blue-600">{stats.pendingOrders} en attente</p>
                )}
              </div>
            </Link>
            <Link
              href="/admin/stocks"
              className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
            >
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <span className="font-medium text-green-900">Gérer les stocks</span>
                {stats.lowStockProducts > 0 && (
                  <p className="text-sm text-green-600">{stats.lowStockProducts} stock faible</p>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
