import Link from 'next/link';
import type { PublicProperty } from '@/lib/types';
import { IArea, IBath, IBed, IPin } from './icons';

/**
 * การ์ดทรัพย์ฝั่งลูกค้า (pixel-clone Findit)
 * รูป + ป้าย → ทำเล → ชื่อ → Beds/Baths/Sqft → เส้นแบ่ง → ราคา
 *
 * ⚠️ ใช้ token ชุด `v2-*` เท่านั้น (ห้ามปนกับ palette ฝั่ง admin)
 * และห้าม import อะไรจาก components/admin/* เข้ามา (bundle isolation)
 */
const TYPE_LABEL: Record<PublicProperty['type'], string> = {
  condo: 'Condo',
  house: 'House',
  townhome: 'Townhome',
  apartment: 'Apartment',
};

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-v2-muted">
      <span className="text-v2-ink/70">{icon}</span>
      {label}: <span className="text-v2-ink">{value}</span>
    </span>
  );
}

export function PropertyCard({ property }: { property: PublicProperty }) {
  const rent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    property.monthlyRent,
  );

  return (
    <Link
      href={`/property/${property.slug}`}
      className="group flex flex-col overflow-hidden rounded-card-v2 bg-v2-soft transition hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {property.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.coverImageUrl}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-v2-line" />
        )}

        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-pill bg-v2-ink px-3 py-1.5 text-xs text-white">
            {TYPE_LABEL[property.type]}
          </span>
          <span className="rounded-pill bg-white px-3 py-1.5 text-xs text-v2-ink">For Rent</span>
        </div>
      </div>

      <div className="p-5">
        <p className="flex items-center gap-1.5 text-sm text-v2-muted">
          <span className="text-v2-ink/60">{IPin}</span>
          {[property.district, property.province].filter(Boolean).join(', ') || '—'}
        </p>

        <h3 className="mt-1 text-xl font-medium text-v2-ink">{property.title}</h3>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {property.bedrooms !== null && (
            <Spec icon={IBed} label="Beds" value={String(property.bedrooms)} />
          )}
          {property.bathrooms !== null && (
            <Spec icon={IBath} label="Baths" value={String(property.bathrooms)} />
          )}
          {property.areaSqm !== null && (
            <Spec icon={IArea} label="Sqm" value={String(property.areaSqm)} />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-v2-line pt-4">
          <span className="text-sm text-v2-muted">{property.code}</span>
          <span className="text-xl font-medium text-v2-ink">
            ฿{rent}
            <span className="text-sm font-normal text-v2-muted">/mo</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
