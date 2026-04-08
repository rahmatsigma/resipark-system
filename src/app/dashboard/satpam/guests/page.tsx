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
  Ban,
  CheckCircle,
  UserCheck,
  Clock,
} from 'lucide-react';
import { formatDateTime, getStatusColor } from '@/lib/utils';

interface GuestAccess {
  id: string;
  maxDurationHours: number;
  purpose: string;
  accessRecord: {
    vehicle: {
      platNumber: string;
      brand: string;
      color: string;
    };
    entryTime: string;
    exitTime: string | null;
    status: string;
  };
  hostHouse: {
    houseNumber: string;
    block: string;
  };
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    platNumber: '',
    brand: '',
    color: '',
    hostHouseNumber: '',
    purpose: '',
    maxDurationHours: 8,
  });

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/guests');
      const data = await response.json();

      if (data.success) {
        setGuests(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchGuests();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Tamu berhasil diregistrasi');
        setDialogOpen(false);
        setFormData({
          platNumber: '',
          brand: '',
          color: '',
          hostHouseNumber: '',
          purpose: '',
          maxDurationHours: 8,
        });
        fetchGuests();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal meregistrasi tamu');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async (id: string, hours: number) => {
    try {
      const response = await fetch(`/api/guests/${id}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });

      const data = await response.json();

      if (data.success) {
        fetchGuests();
      } else {
        alert(data.error?.message || 'Gagal memperpanjang waktu');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registrasi Tamu</CardTitle>
              <CardDescription>Kelola parkir kendaraan tamu</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrasi Tamu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Registrasi Tamu Baru</DialogTitle>
                    <DialogDescription>
                      Isi data kendaraan tamu
                    </DialogDescription>
                  </DialogHeader>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platNumber">Plat Nomor</Label>
                        <Input
                          id="platNumber"
                          placeholder="B 1234 ABC"
                          value={formData.platNumber}
                          onChange={(e) => setFormData({ ...formData, platNumber: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxDurationHours">Durasi Maksimal</Label>
                        <Select
                          value={formData.maxDurationHours.toString()}
                          onValueChange={(v) => setFormData({ ...formData, maxDurationHours: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih durasi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Jam</SelectItem>
                            <SelectItem value="4">4 Jam</SelectItem>
                            <SelectItem value="6">6 Jam</SelectItem>
                            <SelectItem value="8">8 Jam</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Merk Kendaraan</Label>
                        <Input
                          id="brand"
                          placeholder="Honda, Toyota, dll"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color">Warna</Label>
                        <Input
                          id="color"
                          placeholder="Hitam, Putih, dll"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hostHouseNumber">Tuan Rumah</Label>
                      <Input
                        id="hostHouseNumber"
                        placeholder="Nomor rumah (contoh: A-01)"
                        value={formData.hostHouseNumber}
                        onChange={(e) => setFormData({ ...formData, hostHouseNumber: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purpose">Tujuan Kunjungan</Label>
                      <Input
                        id="purpose"
                        placeholder="Bertemu, mengantar, dll"
                        value={formData.purpose}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Registrasi
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
          ) : guests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada tamu aktif</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guests.map((guest) => (
                <Card key={guest.id} className="overflow-hidden">
                  <div className={`h-1 ${
                    guest.accessRecord.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                  }`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-lg">
                        {guest.accessRecord.vehicle.platNumber}
                      </span>
                      <Badge variant={guest.accessRecord.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {guest.accessRecord.status === 'ACTIVE' ? 'Aktif' : 'Selesai'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Kendaraan:</span>{' '}
                      {guest.accessRecord.vehicle.brand} - {guest.accessRecord.vehicle.color}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tuan Rumah:</span>{' '}
                      {guest.hostHouse.block}-{guest.hostHouse.houseNumber}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tujuan:</span>{' '}
                      {guest.purpose}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {guest.maxDurationHours} jam maksimal
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Masuk:</span>{' '}
                      {formatDateTime(guest.accessRecord.entryTime)}
                    </div>

                    {guest.accessRecord.status === 'ACTIVE' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleExtend(guest.id, 2)}
                        >
                          +2 Jam
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleExtend(guest.id, 4)}
                        >
                          +4 Jam
                        </Button>
                      </div>
                    )}
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
