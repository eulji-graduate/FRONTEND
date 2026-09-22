import { AuthSkeleton } from "@/features/auth/components/auth-skeleton";

export default function Loading() {
  return <AuthSkeleton rowCount={6} />;
}
