import { Skeleton } from "@/components/ui/skeleton";
import { WEEKLY_CALENDAR_HEIGHT_PX } from "@/features/rooms/calendar-height";

export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <Skeleton className="w-full rounded-lg" style={{ height: WEEKLY_CALENDAR_HEIGHT_PX }} />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </main>
  );
}
