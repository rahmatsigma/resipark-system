- Susun Payload API /api/auth/login
1. Authentication API
POST /api/auth/login

// Request Body
interface LoginRequest {
username: string;
password: string;
}

// Response Success (200)
interface LoginResponse {
success: true;
data: {
user: {
id: string;
username: string;
fullName: string;
role: UserRole;
};
token: string;
expiresAt: string;
};
}

// Response Error (401)
interface LoginErrorResponse {
success: false;
error: {
code: "INVALID_CREDENTIALS";
message: "Username atau password salah";
};
}

GET /api/auth/me
// Headers
// Authorization: Bearer <token>
// Response Success (200)
interface MeResponse {
success: true;
data: {
id: string;
username: string;
33
email: string;
fullName: string;
phone: string;
role: UserRole;
house?: {
id: string;
houseNumber: string;
};
};
}

- Susun Payload API /api/vehicles
1. Request Payload (JSON)
Berikut adalah struktur body request yang harus dikirim oleh Frontend saat mendaftarkan kendaraan:

JSON
{
  "platNumber": "B 1234 ABC",    // Wajib: String. Akan divalidasi format regex-nya.
  "brand": "Honda",              // Wajib: String. Merk kendaraan.
  "color": "Hitam",              // Wajib: String. Warna kendaraan.
  "vehicleType": "MOTOR",        // Opsional: Enum ("MOTOR", "SEDAN", "MINIBUS", "PICKUP", "TRUK"). Default: "MOTOR"
  "category": "WARGA",           // Opsional: Enum ("WARGA", "TAMU", "SERVICE", "DELIVERY"). Default: "WARGA"
  "houseId": "cuid-house-123"    // Opsional: String. Jika user adalah WARGA, backend akan mengabaikan ini dan otomatis memakai houseId milik user tersebut.
}
2. Error Response Format
Sistem ini menggunakan standar format eror yang seragam, yaitu membungkus pesan eror dalam objek error dengan menyertakan code dan message. Berikut adalah daftar respons eror spesifik untuk fitur pendaftaran kendaraan:

A. Format Plat Nomor Tidak Valid (FR-KND-002)
Terjadi jika plat nomor tidak sesuai standar Indonesia (misal: mengandung karakter aneh atau tidak sesuai pola).

Status Code: 400 Bad Request

JSON
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format plat nomor tidak valid. Gunakan format standar (contoh: B 1234 ABC)"
  }
}
B. Kuota Kendaraan Penuh (FR-KND-004 & FR-KND-005)
Terjadi jika user dengan role WARGA mencoba mendaftarkan kendaraan ke-3 (maksimal 2 kendaraan aktif per rumah).

Status Code: 400 Bad Request

JSON
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Kuota kendaraan sudah penuh (2/2)"
  }
}
C. Plat Nomor Duplikat (FR-KND-003)
Terjadi jika sistem mendeteksi plat nomor sudah terdaftar di database sebelumnya (sifatnya unik).

Status Code: 409 Conflict

JSON
{
  "success": false,
  "error": {
    "code": "DUPLICATE_PLAT",
    "message": "Plat nomor sudah terdaftar"
  }
}
D. Tidak Terautentikasi (Unauthorized)
Terjadi jika Frontend menembak endpoint tanpa sesi login yang valid.

Status Code: 401 Unauthorized

JSON
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Tidak terautentikasi"
  }
}
E. Kesalahan Sistem Internal
Terjadi jika ada kendala di sisi server atau database.

Status Code: 500 Internal Server Error

JSON
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Terjadi kesalahan sistem"
  }
}
3. Success Response (FR-KND-006)
Jika semua validasi lolos, sistem akan menyimpan data, mencatat ke Activity Log, dan mengembalikan respons sukses.

Status Code: 201 Created

JSON
{
  "success": true,
  "data": {
    "id": "cuid-vehicle-789",
    "platNumber": "B 1234 ABC",
    "vehicleType": "MOTOR",
    "brand": "Honda",
    "color": "Hitam",
    "category": "WARGA",
    "status": "ACTIVE",
    "houseId": "cuid-house-123",
    "userId": "cuid-user-456",
    "registeredAt": "2026-04-04T14:20:00.000Z"
  }
}