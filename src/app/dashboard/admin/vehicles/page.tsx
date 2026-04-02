'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Car,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { VEHICLE_TYPE_LABELS, VEHICLE_CATEGORY_LABELS, getStatusColor } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak Aktif',
  BLACKLISTED: 'Blacklist',
};

interface Vehicle {
  id: string;
  platNumber: string;
  vehicleType: string;
  brand: string;
  color: string;
  category: string;
  status: string;
  house?: {
    id: string;
    houseNumber: string;
    block: string;
  } | null;
  blacklist?: {
    id: string;
    reason: string;
  } | null;
  registeredAt: string;
}

type HouseStatus = 'VACANT' | 'OCCUPIED';

interface House {
  id: string;
  houseNumber: string;
  block: string;
  status: HouseStatus;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    platNumber: '',
    vehicleType: 'MOTOR',
    brand: '',
    color: '',
    category: 'WARGA',
    houseId: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    status: 'ACTIVE',
    category: 'WARGA',
    houseId: '',
  });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/vehicles?${params}`);
      const data = await response.json();

      if (data.success) {
        setVehicles(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouses = async () => {
    try {
      const response = await fetch('/api/houses');
      const data = await response.json();
      if (data.success) {
        setHouses(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch houses:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchHouses();
  }, [page, search, categoryFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        houseId:
          !formData.houseId || formData.houseId === 'none'
            ? null
            : formData.houseId,
      };

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kendaraan berhasil didaftarkan');
        setDialogOpen(false);
        setFormData({
          platNumber: '',
          vehicleType: 'MOTOR',
          brand: '',
          color: '',
          category: 'WARGA',
          houseId: '',
        });
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal mendaftarkan kendaraan');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditFormData({
      status: vehicle.status,
      category: vehicle.category,
      houseId: vehicle.house?.id || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    setError('');
    setSaving(true);

    try {
      const payload = {
        ...editFormData,
        houseId:
          !editFormData.houseId || editFormData.houseId === 'none'
            ? null
            : editFormData.houseId,
      };

      const response = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kendaraan berhasil diupdate');
        setEditDialogOpen(false);
        setEditingVehicle(null);
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal mengupdate kendaraan');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan kendaraan ini? Kendaraan akan menjadi tidak aktif.')) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kendaraan berhasil dinonaktifkan');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert(data.error?.message || 'Gagal menghapus kendaraan');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('PERHATIAN: Ini akan menghapus kendaraan secara PERMANEN dari database. Data tidak dapat dikembalikan. Lanjutkan?')) return;
    if (!confirm('Apakah Anda yakin sekali lagi? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const response = await fetch(`/api/vehicles/${id}?permanent=true`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Kendaraan berhasil dihapus permanen');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert(data.error?.message || 'Gagal menghapus kendaraan');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Kendaraan</CardTitle>
              <CardDescription>Kelola semua kendaraan terdaftar</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Kendaraan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Daftarkan Kendaraan Baru</DialogTitle>
                    <DialogDescription>
                      Isi form berikut untuk mendaftarkan kendaraan
                    </DialogDescription>
                  </DialogHeader>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="platNumber">Plat Nomor</Label>
                      <Input
                        id="platNumber"
                        placeholder="B 1234 ABC"
                        value={formData.platNumber}
                        onChange={(e) => setFormData({ ...formData, platNumber: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="vehicleType">Jenis Kendaraan</Label>
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

                      <div className="grid gap-2">
                        <Label htmlFor="category">Kategori</Label>
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
                      <div className="grid gap-2">
                        <Label htmlFor="brand">Merk</Label>
                        <Input
                          id="brand"
                          placeholder="Honda"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="color">Warna</Label>
                        <Input
                          id="color"
                          placeholder="Hitam"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="house">Rumah (Opsional)</Label>
                      <Select
                        value={formData.houseId}
                        onValueChange={(value) => setFormData({ ...formData, houseId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih rumah" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa Rumah</SelectItem>
                          {houses
                            .filter(h => h.status === 'OCCUPIED')
                            .map((house) => (
                              <SelectItem key={house.id} value={house.id}>
                                Blok {house.block} - {house.houseNumber}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Daftarkan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari plat nomor atau merk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Object.entries(VEHICLE_CATEGORY_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                <SelectItem value="BLACKLISTED">Blacklist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada kendaraan ditemukan</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plat Nomor</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Merk / Warna</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Rumah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          {vehicle.platNumber}
                          {vehicle.blacklist && (
                            <div className="text-xs text-red-600 mt-1">
                              Blacklist: {vehicle.blacklist.reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{VEHICLE_TYPE_LABELS[vehicle.vehicleType]}</TableCell>
                        <TableCell>{vehicle.brand} - {vehicle.color}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {VEHICLE_CATEGORY_LABELS[vehicle.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.house ? `${vehicle.house.block}-${vehicle.house.houseNumber}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {STATUS_LABELS[vehicle.status] || vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(vehicle)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSoftDelete(vehicle.id)}
                              className="text-orange-600 hover:text-orange-700"
                              title="Nonaktifkan"
                              disabled={vehicle.status === 'INACTIVE'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Kendaraan</DialogTitle>
              <DialogDescription>
                Ubah status, kategori, dan rumah untuk kendaraan {editingVehicle?.platNumber}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Kategori</Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="grid gap-2">
                <Label>Rumah</Label>
                <Select
                  value={editFormData.houseId}
                  onValueChange={(value) => setEditFormData({ ...editFormData, houseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rumah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Rumah</SelectItem>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        Blok {house.block} - {house.houseNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (editingVehicle) {
                      handlePermanentDelete(editingVehicle.id);
                      setEditDialogOpen(false);
                    }
                  }}
                >
                  Hapus Permanen
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
