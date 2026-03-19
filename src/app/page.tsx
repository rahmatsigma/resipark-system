'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Registration state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [houses, setHouses] = useState<{id: string; houseNumber: string; block: string}[]>([]);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    houseNumber: '',
  });

  const fetchHouses = async () => {
    try {
      // Fetch only VACANT houses for registration (public endpoint, no auth required)
      const response = await fetch('/api/houses?public=true');
      const data = await response.json();
      if (data.success) {
        setHouses(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch houses:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect based on role
        const role = data.data.user.role;
        switch (role) {
          case 'ADMIN':
            router.push('/dashboard/admin');
            break;
          case 'SATPAM':
            router.push('/dashboard/satpam');
            break;
          case 'WARGA':
            router.push('/dashboard/warga');
            break;
          case 'PENGELOLA':
            router.push('/dashboard/pengelola');
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        setError(data.error?.message || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (data.success) {
        setRegisterSuccess('Registrasi berhasil! Silakan login dengan akun baru Anda.');
        setRegisterForm({
          fullName: '',
          email: '',
          phone: '',
          username: '',
          password: '',
          houseNumber: '',
        });
        setTimeout(() => {
          setRegisterOpen(false);
          setRegisterSuccess('');
        }, 2000);
      } else {
        setRegisterError(data.error?.message || 'Registrasi gagal');
      }
    } catch (err) {
      setRegisterError('Terjadi kesalahan sistem');
    } finally {
      setRegisterLoading(false);
    }
  };

  const openRegisterDialog = () => {
    setRegisterOpen(true);
    fetchHouses();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Sistem Parkir Perumahan</CardTitle>
            <CardDescription className="mt-2">
              Masuk ke sistem manajemen parkir
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
          
          {/* Register Button */}
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={openRegisterDialog}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Daftar Akun Baru (Warga)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Daftar Akun Warga</DialogTitle>
                <DialogDescription>
                  Buat akun baru untuk warga perumahan
                </DialogDescription>
              </DialogHeader>
              
              {registerSuccess && (
                <Alert className="bg-green-50 border-green-200 mt-4">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{registerSuccess}</AlertDescription>
                </Alert>
              )}
              
              {registerError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Lengkap</Label>
                    <Input
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                      required
                      disabled={registerLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Telepon</Label>
                    <Input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                      disabled={registerLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    required
                    disabled={registerLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                      required
                      disabled={registerLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      required
                      minLength={6}
                      disabled={registerLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Nomor Rumah <span className="text-red-500">*</span></Label>
                  <Select
                    value={registerForm.houseNumber}
                    onValueChange={(value) => setRegisterForm({...registerForm, houseNumber: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rumah yang tersedia" />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.length === 0 ? (
                        <SelectItem value="none" disabled>Tidak ada rumah tersedia</SelectItem>
                      ) : (
                        houses.map((house) => (
                          <SelectItem key={house.id} value={house.houseNumber}>
                            Blok {house.block} - No. {house.houseNumber}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pilih rumah kosong yang tersedia untuk didaftarkan
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRegisterOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mendaftar...
                      </>
                    ) : (
                      'Daftar'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
            <p className="font-medium mb-2">Demo Login:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Admin: <span className="font-mono">admin</span></div>
              <div>Satpam: <span className="font-mono">satpam1</span></div>
              <div>Warga: <span className="font-mono">warga1</span></div>
              <div>Pengelola: <span className="font-mono">pengelola</span></div>
            </div>
            <p className="mt-2 text-xs">Password: <span className="font-mono">password123</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
