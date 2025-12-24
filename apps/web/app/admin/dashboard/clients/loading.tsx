import { BrandedSpinner } from '@/components/admin/client-detail/skeletons';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <BrandedSpinner />
    </div>
  );
}
