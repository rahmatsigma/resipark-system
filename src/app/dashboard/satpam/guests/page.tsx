'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
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
  CheckCircle,
  UserCheck,
  Clock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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
  expiredAt?: string | null;
}

interface HostHouse {
  id: string;
  houseNumber: string;
  block: string;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatMs(ms: number) {
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const mins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((abs % (1000 * 60)) / 1000);
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

function formatRemainingTime(guest: GuestAccess, now: Date) {
  const entry = new Date(guest.accessRecord.entryTime);
  const expiry = guest.expiredAt ? new Date(guest.expiredAt) : new Date(entry.getTime() + guest.maxDurationHours * 60 * 60 * 1000);
  const diff = expiry.getTime() - now.getTime();
  if (diff >= 0) return formatMs(diff);
  return `Terlambat ${formatMs(-diff)}`;
}

function getRemainingClass(guest: GuestAccess, now: Date) {
  const entry = new Date(guest.accessRecord.entryTime);
  const expiry = guest.expiredAt ? new Date(guest.expiredAt) : new Date(entry.getTime() + guest.maxDurationHours * 60 * 60 * 1000);
  const diff = expiry.getTime() - now.getTime();
  const FIFTEEN_MIN = 15 * 60 * 1000;
  if (diff < 0) return 'text-red-600 font-semibold';
  if (diff <= FIFTEEN_MIN) return 'text-amber-600 font-semibold';
  return 'text-emerald-700 font-medium';
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestAccess[]>([]);
  const [houses, setHouses] = useState<HostHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<null | { id: string; maxDurationHours: number }>(null);
  const [editDurationInput, setEditDurationInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    platNumber: '',
    brand: '',
    color: '',
    hostHouseNumber: '',
    purpose: '',
    maxDurationHours: '',
  });

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/guests');
      const data = await response.json();

      if (data.success) {
        setGuests(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouses = async () => {
    try {
      const res = await fetch('/api/houses');
      const data = await res.json();
      if (data.success) setHouses(data.data || []);
    } catch (err) {
      logger.error('Failed to fetch houses for host select', err);
    }
  };

  useEffect(() => {
    fetchGuests();
    fetchHouses();
  }, []);

  // Update 'now' every second to drive countdown timers
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
          maxDurationHours: '',
        });
        fetchGuests();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal meregistrasi tamu');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (id: string, currentHours: number) => {
    setEditingGuest({ id, maxDurationHours: currentHours });
    setEditDurationInput(String(currentHours));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGuest) return;
    const parsedHours = Number(editDurationInput);
    if (!Number.isInteger(parsedHours)) {
      alert('Masukkan angka bulat. Gunakan nilai minus untuk simulasi overtime/denda.');
      return;
    }

    try {
      const response = await fetch(`/api/guests/${editingGuest.id}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationHours: parsedHours }),
      });

      const data = await response.json();
      if (data.success) {
        setEditDialogOpen(false);
        setEditingGuest(null);
        setEditDurationInput('');
        fetchGuests();
      } else {
        alert(data.error?.message || 'Gagal menyimpan durasi');
      }
    } catch {
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
                          value={formData.maxDurationHours}
                          onValueChange={(v) => setFormData({ ...formData, maxDurationHours: v })}
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
                      <Select
                        value={formData.hostHouseNumber}
                        onValueChange={(v) => setFormData({ ...formData, hostHouseNumber: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tuan rumah" />
                        </SelectTrigger>
                        <SelectContent>
                          {houses.length === 0 ? (
                            <SelectItem value="">Tidak ada data</SelectItem>
                          ) : (
                            houses.map((h) => (
                              <SelectItem key={h.id} value={h.houseNumber}>
                                {h.block}-{h.houseNumber}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
                    <Button
                      type="submit"
                      disabled={saving || !formData.maxDurationHours}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
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
                        {guest.accessRecord.vehicle.platNumber || '—'}
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
                    <p className="text-xs text-muted-foreground">
                      Saat edit durasi, masukkan nilai minus (contoh: -2) agar tamu langsung overtime untuk tes denda.
                    </p>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Masuk:</span>{' '}
                      {formatDateTime(guest.accessRecord.entryTime)}
                    </div>
                    {guest.accessRecord.status === 'ACTIVE' ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Sisa Waktu:</span>{' '}
                        <span className={getRemainingClass(guest, now)}>
                          {formatRemainingTime(guest, now)}
                        </span>
                        {(() => {
                          const entry = new Date(guest.accessRecord.entryTime);
                          const expiry = guest.expiredAt ? new Date(guest.expiredAt) : new Date(entry.getTime() + guest.maxDurationHours * 60 * 60 * 1000);
                          const diff = expiry.getTime() - now.getTime();
                          const FIFTEEN_MIN = 15 * 60 * 1000;
                          if (diff > 0 && diff <= FIFTEEN_MIN) {
                            return <Badge className="ml-2 bg-amber-100 text-amber-800">Hampir Habis</Badge>;
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Keluar:</span>{' '}
                        {guest.accessRecord.exitTime ? formatDateTime(guest.accessRecord.exitTime) : '—'}
                      </div>
                    )}
                    {guest.accessRecord.status === 'ACTIVE' && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(guest.id, guest.maxDurationHours)}
                        >
                          Edit Durasi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchGuests()}
                        >
                          Refresh
                        </Button>
                      </div>
                    )}
                    {/* Edit Duration Dialog */}
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Durasi Tamu</DialogTitle>
                          <DialogDescription>
                            Masukkan angka jam. Nilai positif = durasi normal, nilai minus = expired di masa lalu (untuk test denda).
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Label>Durasi (jam)</Label>
                          <Input
                            className="mt-2"
                            type="number"
                            step={1}
                            value={editDurationInput}
                            onChange={(e) => setEditDurationInput(e.target.value)}
                            placeholder="Contoh: 8 atau -2"
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Durasi saat ini: {editingGuest?.maxDurationHours ?? 0} jam
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditDialogOpen(false);
                              setEditingGuest(null);
                              setEditDurationInput('');
                            }}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleSaveEdit}
                            className="bg-emerald-500 hover:bg-emerald-600"
                            disabled={!Number.isInteger(Number(editDurationInput))}
                          >
                            Simpan
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
