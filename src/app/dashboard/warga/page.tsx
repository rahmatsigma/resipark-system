'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Clock, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Vehicle {
  id: string;
  platNumber: string;
  vehicleType: string;
  brand: string;
  color: string;
  category: string;
  status: string;
  registeredAt: string;
}

interface Violation {
  id: string;
  totalFine: number;
  status: string;
  violationDate: string;
  violationType: {
    name: string;
  };
}

export default function WargaDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, violationsRes] = await Promise.all([
          fetch('/api/vehicles?limit=5'),
          fetch('/api/violations?limit=5'),
        ]);

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          setVehicles(data.data || []);
        }

        if (violationsRes.ok) {
          const data = await violationsRes.json();
          setViolations(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kendaraan Saya</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground">kendaraan terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggaran Aktif</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {violations.filter(v => v.status === 'PENDING').length}
            </div>
            <p className="text-xs text-muted-foreground">menunggu pembayaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Denda</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {violations
                .filter(v => v.status === 'PENDING')
                .reduce((sum, v) => sum + v.totalFine, 0)
                .toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">belum dibayar</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kendaraan Saya</CardTitle>
              <CardDescription>Daftar kendaraan yang terdaftar atas nama Anda</CardDescription>
            </div>
            <Link href="/dashboard/warga/vehicles">
              <Button variant="outline" size="sm">
                Lihat Semua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada kendaraan terdaftar</p>
              <Link href="/dashboard/warga/vehicles">
                <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Daftarkan Kendaraan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                      <Car className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium font-mono">{vehicle.platNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.brand} - {vehicle.color}
                      </p>
                    </div>
                  </div>
                  <Badge variant={vehicle.status === 'ACTIVE' ? 'default' : 'destructive'}>
                    {vehicle.status === 'ACTIVE' ? 'Aktif' : vehicle.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pelanggaran Terakhir</CardTitle>
              <CardDescription>Daftar pelanggaran kendaraan Anda</CardDescription>
            </div>
            <Link href="/dashboard/warga/violations">
              <Button variant="outline" size="sm">
                Lihat Semua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pelanggaran</p>
            </div>
          ) : (
            <div className="space-y-3">
              {violations.slice(0, 3).map((violation) => (
                <div
                  key={violation.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      violation.status === 'PENDING' 
                        ? 'bg-yellow-100 dark:bg-yellow-900' 
                        : 'bg-green-100 dark:bg-green-900'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        violation.status === 'PENDING' 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{violation.violationType.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(violation.violationDate).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      Rp {violation.totalFine.toLocaleString('id-ID')}
                    </p>
                    <Badge variant={violation.status === 'PENDING' ? 'destructive' : 'secondary'}>
                      {violation.status === 'PENDING' ? 'Belum Bayar' : 'Lunas'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
