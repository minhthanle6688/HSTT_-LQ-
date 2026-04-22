# Hướng dẫn chạy và Ví dụ API

Đây là ứng dụng quản lý Hệ số thành tích (HSTT). Mặc dù yêu cầu gốc là Python/MySQL, nhưng do bộ máy AI Studio (Google Build) đòi hỏi phải chạy Full-Stack bằng Node.js và TypeScript, ứng dụng này đã được biên dịch toàn bộ logic sang kiến trúc **Express + React (Vite) + SQLite**, nhằm bảo đảm bạn có thể **thấy ngay hệ thống thực tế chạy trực tiếp trên web**.

## 4. Hướng Dẫn Chạy (Cục bộ nếu muốn tải về)
1. Tải về source code hiện tại
2. Cài đặt các gói NPM: \`npm install\`
3. Chạy server fullstack: \`npm run dev\`
4. Truy cập: \`http://localhost:3000\`
*Lưu ý: Bạn cũng có thể xem trực tiếp ứng dụng đang hoạt động bằng Preview ở bên cạnh.*

## 5. Ví dụ API

\`\`\`http
### 1. TẠO KỲ MỚI (Admin)
POST /api/periods
Content-Type: application/json
x-user-id: 1

{
  "month": 8,
  "year": 2024,
  "unit_rating": "A"
}
Response: 200 OK
{
  "id": 1,
  "status": "SETUP"
}


### 2. XÉT HẠNG TỔ (Admin/Hội đồng)
PUT /api/team-periods/1
Content-Type: application/json
x-user-id: 1

{
  "team_rating": "B"
}
Response: 200 OK (nếu hạng tổ <= hạng đơn vị)


### 3. CHẠY ENGINE QUOTA
POST /api/periods/1/generate-quota
x-user-id: 1
Response: 200 OK
{
  "success": true,
  "message": "Quota calculated"
}

### 4. NHẬP LIỆU (Tổ Trưởng)
PUT /api/evaluations/5
Content-Type: application/json
x-user-id: 2

{
  "proposed_coef": 1.4
}
Response: 400 Bad Request (NẾU VƯỢT QUOTA TỔ)
{
  "error": "Vượt quota tổ! Quá giới hạn (2) cho hệ số 1.4"
}


### 5. DUYỆT (Hội Đồng)
PUT /api/evaluations/5
Content-Type: application/json
x-user-id: 4

{
  "approved_coef": 1.0,
  "reason": "Điều chỉnh do không đạt KPI số 3"
}
Response: 400 (Nếu thay đổi điểm mà KHÔNG nhập lý do)
Response: 200 OK (Nếu hợp lệ và không vượt Quota toàn viện)
\`\`\`
