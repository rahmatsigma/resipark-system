'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { VIOLATION_LABELS } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface ViolationResult {
  violation: {
    id: string;
    platNumber: string;
    violationType: string;
    totalFine: number;
    multiplier: number;
  };
  autoBlacklist?: {
    triggered: boolean;
    reason?: string;
  } | null;
}

export default function SatpamViolationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ViolationResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    platNumber: '',
    violationType: '',
    description: '',
    customAmount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platNumber: formData.platNumber,
          violationTypeCode: formData.violationType,
          description: formData.description,
          customAmount: formData.customAmount ? parseFloat(formData.customAmount) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setSuccess('Pelanggaran berhasil dicatat');
        setFormData({
          platNumber: '',
          violationType: '',
          description: '',
          customAmount: '',
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Gagal mencatat pelanggaran');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Catat Pelanggaran
            </CardTitle>
            <CardDescription>
              Catat pelanggaran dan sistem akan menghitung denda otomatis
            </CardDescription>
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
                <Label htmlFor="platNumber">Plat Nomor</Label>
                <Input
                  id="platNumber"
                  placeholder="B 1234 ABC"
                  value={formData.platNumber}
                  onChange={(e) => setFormData({ ...formData, platNumber: e.target.value.toUpperCase() })}
                  required
                  disabled={loading}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="violationType">Jenis Pelanggaran</Label>
                <Select
                  value={formData.violationType}
                  onValueChange={(value) => setFormData({ ...formData, violationType: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis pelanggaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIOLATION_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.violationType === 'MERUSAK_FASILITAS' && (
                <div className="space-y-2">
                  <Label htmlFor="customAmount">Estimasi Kerusakan (Rp)</Label>
                  <Input
                    id="customAmount"
                    type="number"
                    placeholder="500000"
                    value={formData.customAmount}
                    onChange={(e) => setFormData({ ...formData, customAmount: e.target.value })}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Keterangan</Label>
                <Textarea
                  id="description"
                  placeholder="Detail pelanggaran..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600"
                disabled={loading || !formData.platNumber || !formData.violationType}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Catat Pelanggaran
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-6">
          {/* Fine Calculation Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ketentuan Denda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>Parkir di luar area</span>
                <span className="font-medium">{formatCurrency(50000)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Parkir di jalur darurat</span>
                <span className="font-medium">{formatCurrency(100000)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Overtime (per jam)</span>
                <span className="font-medium">{formatCurrency(25000)}</span>
              </div>
              <hr />
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Multiplier:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pelanggaran ke-3 (dalam 30 hari): Denda x2</li>
                  <li>Pelanggaran ke-5 (dalam 30 hari): Denda x3</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className={`border-2 ${
              result.autoBlacklist?.triggered ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
            }`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${
                  result.autoBlacklist?.triggered ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  {result.autoBlacklist?.triggered ? (
                    <>
                      <AlertCircle className="h-5 w-5" />
                      Pelanggaran Dicatat + Auto Blacklist
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Pelanggaran Dicatat
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plat Nomor</p>
                    <p className="font-mono font-bold text-lg">{result.violation.platNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis</p>
                    <p className="font-medium">{result.violation.violationType}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">Total Denda</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(result.violation.totalFine)}
                    </span>
                  </div>
                  {result.violation.multiplier > 1 && (
                    <div className="mt-2 text-sm text-amber-600">
                      <Badge variant="outline" className="bg-amber-100">
                        Multiplier x{result.violation.multiplier}
                      </Badge>
                    </div>
                  )}
                </div>

                {result.autoBlacklist?.triggered && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Auto-Blacklist Aktif!</strong>
                      <br />
                      {result.autoBlacklist.reason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
