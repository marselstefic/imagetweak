"use client";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  return (
    <div className="flex items-center justify-center pt-10">
    <main className="flex flex-col items-center">
      <SignedOut>
        <p className="text-xl font-bold text-red-500">SIGN UP TO SEE THIS GALLERY!!!!</p>
      </SignedOut>
      <SignedIn>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-5 md:gap-10 pt-10 md:pt-20">
          {Array.from({ length: 17 }).map((_, i) => (
            <Skeleton key={i}  className="h-20 w-20 md:h-32 md:w-32 bg-gray-100 rounded-md" />
          ))}
        </div>
      </SignedIn>
    </main>
  </div>
);
}
