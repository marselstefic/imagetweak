"use client";

import FileUpload from "@/components/FileUpload";
import { fetchUsers } from "@/lib/actions";
import { User } from "@/types/User";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState({
    resX: Number,
    resY: Number,
    rotationState: Number,
    brightness: Number,
    contrast: Number,
    saturation: Number,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex justify-center min-h-screen">
      <main className="flex flex-col p-20 pt-8">
        {" "}
        {/* Added padding-top to avoid overlap */}
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>
        <SignedIn>
          <div className="flex flex-col p-6 bg-gray-200 rounded-xl w-80 min-h-80 shadow-md">
            <div className="mb-4 text-center">
              <FileUpload />
            </div>
            <div className="text-center">
            <form onSubmit={handleSubmit} className="space-y-4">

              </form>
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}

