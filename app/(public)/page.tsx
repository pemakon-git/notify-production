/**
 * หน้าแรกฝั่งลูกค้า — เนื้อหาจริง (listing + ฟอร์มนัดดู) อยู่ใน milestone 12
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-4 py-12">
      <p className="text-sm font-medium uppercase tracking-wider text-slate-500">public</p>
      <h1 className="text-3xl font-semibold">ค้นหาทรัพย์ให้เช่า</h1>
      <p className="max-w-prose text-slate-600">
        โครงพร้อมแล้ว — หน้า listing อ่านตรงจาก Supabase ผ่าน RLS (เห็นเฉพาะทรัพย์ที่เผยแพร่แล้ว)
        และฟอร์มนัดดูยิงไป <code className="rounded bg-slate-100 px-1">/api/public/appointments</code>{' '}
        ตาม milestone 12
      </p>
    </div>
  );
}
