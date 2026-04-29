'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  AlertCircle, 
  Loader2,
  Car,
  Edit,
  Trash2,
} from 'lucide-react';
import { VEHICLE_TYPE_LABELS, VEHICLE_CATEGORY_LABELS, getStatusColor } from '@/lib/utils';

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

interface House {
  id: string;
  houseNumber: string;
  block: string;
}

export default function WargaVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quota, setQuota] = useState({ current: 0, max: 2 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    platNumber: '',
    vehicleType: 'MOTOR',
    brand: '',
    color: '',
    category: 'WARGA',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, quotaRes] = await Promise.all([
        fetch('/api/vehicles?limit=10'),
        fetch('/api/vehicles/quota'),
      ]);

      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.data || []);
      }

      if (quotaRes.ok) {
        const data = await quotaRes.json();
        setQuota(data.data || { current: 0, max: 2 });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchData();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingVehicle ? 'Kendaraan berhasil diupdate' : 'Kendaraan berhasil didaftarkan');
        setDialogOpen(false);
        resetForm();
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Terjadi kesalahan');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kendaraan ini?')) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchData();
      } else {
        alert(data.error?.message || 'Gagal menghapus kendaraan');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      platNumber: vehicle.platNumber,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand,
      color: vehicle.color,
      category: vehicle.category,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({
      platNumber: '',
      vehicleType: 'MOTOR',
      brand: '',
      color: '',
      category: 'WARGA',
    });
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Quota Card */}
      <Card>
        <CardHeader>
          <CardTitle>Kuota Kendaraan</CardTitle>
          <CardDescription>Maksimal {quota.max} kendaraan per rumah</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-emerald-600">
              {quota.current}/{quota.max}
            </div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(quota.current / quota.max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kendaraan Saya</CardTitle>
              <CardDescription>Daftar kendaraan terdaftar</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  disabled={quota.current >= quota.max && !editingVehicle}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Kendaraan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingVehicle ? 'Update data kendaraan' : 'Daftarkan kendaraan Anda'}
                    </DialogDescription>
                  </DialogHeader>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="platNumber">Plat Nomor</Label>
                      <Input
                        id="platNumber"
                        placeholder="B 1234 ABC"
                        value={formData.platNumber}
                        onChange={(e) => setFormData({ ...formData, platNumber: e.target.value.toUpperCase() })}
                        required
                        disabled={loading || !!editingVehicle}
                        className="font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Jenis Kendaraan</Label>
                        <Select
                          value={formData.vehicleType}
                          onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(VEHICLE_TYPE_LABELS).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(VEHICLE_CATEGORY_LABELS).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Merk</Label>
                        <Input
                          id="brand"
                          placeholder="Honda"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color">Warna</Label>
                        <Input
                          id="color"
                          placeholder="Hitam"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingVehicle ? 'Update' : 'Daftarkan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada kendaraan terdaftar</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="font-mono font-bold text-xl">{vehicle.platNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.brand} - {vehicle.color}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {VEHICLE_TYPE_LABELS[vehicle.vehicleType]}
                          </Badge>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {vehicle.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
