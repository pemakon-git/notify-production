import Link from 'next/link';

/**
 * หน้าแรกฝั่งลูกค้า — โครง hero ตามดีไซน์ v2 (H1 ใหญ่ · ปุ่ม pill คู่)
 * section ที่เหลือ (Featured · Cities · Steps · Fresh · Testimonials · Stats · Insights)
 * อยู่ในรอบพอร์ตฝั่งลูกค้า
 */
export default function HomePage() {
  return (
    <section className="wrap py-20 sm:py-28">
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tightish sm:text-5xl lg:text-6xl">
        Your dream home, just a step away
      </h1>

      <p className="mt-5 max-w-xl text-v2-body">
        Find condos, houses, townhomes and apartments for rent — and book a viewing with our team in
        minutes.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/properties" className="btn-dark">
          Explore properties
        </Link>
        <Link href="/book" className="btn-outline">
          Book a visit
        </Link>
      </div>
    </section>
  );
}
