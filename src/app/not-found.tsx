import Link from "next/link";
import { Shield, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Shield className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Please check the URL or navigate back.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" aria-hidden="true" />
              Go to login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
