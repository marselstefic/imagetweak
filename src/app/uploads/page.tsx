'use client'

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

  return (
    <div className="flex justify-center min-h-screen">
      <main className="flex flex-col p-20 pt-8"> {/* Added padding-top to avoid overlap */}
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>

        <SignedIn>
          <div className="basis-1/2 text-center">
            <FileUpload />
          </div>
          <div className="basis-1/2 text-center">
            {/** Add Parameter options here */}
          </div>
        </SignedIn>
      </main>
    </div>
  );
}