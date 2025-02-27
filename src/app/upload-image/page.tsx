'use client'

import FileUpload from "@/components/FileUpload";
import { fetchUsers } from "@/lib/actions";
import { User } from "@/types/User";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<User[]>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchUsers();
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  });

  console.log(data)
  return (
    <div className="items-center justify-items-center min-h-screen">
      <main className="flex flex-col md:flex-row min-w-full items-center sm:items-start">
        <SignedOut>
          SIGN UP TO SEE THIS PAGE!!!!
        </SignedOut>
        <SignedIn>
          <div className="basis-1/2 text-center">
           <FileUpload/>
          </div>
          <div className="basis-1/2 text-center">
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
