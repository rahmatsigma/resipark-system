'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Car,
  AlertTriangle,
  Users,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  today: {
    totalEntries: number;
    totalExits: number;
    currentParked: number;
    guests: number;
  };
  parking: {
    main: {
      capacity: number;
      occupied: number;
      percentage: number;
    };
    guest: {
      capacity: number;
      occupied: number;
      percentage: number;
    };
  };
  violations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingFines: number;
    totalUnpaid: number;
  };
  vehicles: {
    total: number;
    active: number;
    blacklisted: number;
  };
}

interface ChartData {
  date: string;
  entries: number;
  exits: number;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, chartRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch(`/api/dashboard/charts?period=${period}`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (chartRes.ok) {
        const data = await chartRes.json();
        setChartData(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchData();
  });

  // Calculate max for chart scaling
  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.entries, d.exits)),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Statistik & Analitik</h2>
          <p className="text-muted-foreground">
            Analisis data parkir dan pelanggaran
          </p>
        </div>
        <Select value={period} onValueChange={(v) => {
          setPeriod(v);
          fetchData();
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
            <SelectItem value="90d">90 Hari Terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kendaraan</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.vehicles.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.vehicles.active || 0} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parkir Saat Ini</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today.currentParked || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.today.guests || 0} tamu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggaran Bulan Ini</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.violations.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.violations.thisWeek || 0} minggu ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denda Tertunda</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.violations.totalUnpaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.violations.pendingFines || 0} kasus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Access Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Grafik Akses Kendaraan
            </CardTitle>
            <CardDescription>
              Jumlah kendaraan masuk dan keluar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((item) => (
                <div key={item.date} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-16">{item.date}</span>
                    <div className="flex-1 mx-4 flex gap-2">
                      <div className="flex-1">
                        <div className="h-3 bg-emerald-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded"
                            style={{ width: `${(item.entries / maxValue) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-blue-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded"
                            style={{ width: `${(item.exits / maxValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <span className="text-muted-foreground w-16 text-right">
                      {item.entries}/{item.exits}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center gap-6 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span>Masuk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Keluar</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parking Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Status Kapasitas</CardTitle>
            <CardDescription>
              Penggunaan area parkir saat ini
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Area Parkir Utama</h4>
                  <p className="text-sm text-muted-foreground">
                    {stats?.parking.main.occupied}/{stats?.parking.main.capacity} slot
                  </p>
                </div>
                <Badge variant={(stats?.parking.main.percentage || 0) >= 90 ? 'destructive' : 'secondary'}>
                  {stats?.parking.main.percentage}%
                </Badge>
              </div>
              <Progress 
                value={stats?.parking.main.percentage || 0}
                className={`h-3 ${((stats?.parking.main.percentage || 0) >= 90) ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
              />
            </div>

            {/* Guest Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Area Parkir Tamu</h4>
                  <p className="text-sm text-muted-foreground">
                    {stats?.parking.guest.occupied}/{stats?.parking.guest.capacity} slot
                  </p>
                </div>
                <Badge variant={(stats?.parking.guest.percentage || 0) >= 90 ? 'destructive' : 'secondary'}>
                  {stats?.parking.guest.percentage}%
                </Badge>
              </div>
              <Progress 
                value={stats?.parking.guest.percentage || 0}
                className={`h-3 ${((stats?.parking.guest.percentage || 0) >= 90) ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'}`}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">Masuk Hari Ini</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {stats?.today.totalEntries || 0}
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Keluar Hari Ini</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {stats?.today.totalExits || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violations Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Pelanggaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.violations.today || 0}</div>
              <div className="text-sm text-muted-foreground">Hari Ini</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.violations.thisWeek || 0}</div>
              <div className="text-sm text-muted-foreground">Minggu Ini</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats?.violations.thisMonth || 0}</div>
              <div className="text-sm text-muted-foreground">Bulan Ini</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
              <div className="text-2xl font-bold text-red-600">
                {stats?.violations.pendingFines || 0}
              </div>
              <div className="text-sm text-red-600">Belum Bayar</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
