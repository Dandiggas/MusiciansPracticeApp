import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-5xl font-bold text-center my-10">Welcome to the Musician&apos;s Practice App</h1>
      <div className="flex justify-center items-center gap-4">
        <Button asChild size="lg">
          <Link href="/register">Sign Up</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </div>
  );
}
