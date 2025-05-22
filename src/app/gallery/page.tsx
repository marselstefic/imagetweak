"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchImage } from "@/lib/actions";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [images, setImages] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id || images !== null) return; // Prevent unnecessary fetch if images are already loaded

    const getImages = async () => {
      try {
        const result = await fetchImage(user.id);
        setImages(result || []); // Set images or empty array if none
      } catch (error) {
        console.error("Image fetch error:", error);
        setImages([]); // Set images to empty on error
      }
    };

    getImages();
    console.log(images)
  }, [isLoaded, user?.id, images]); // `images` added to prevent rerun once images are set

  const skeletonCount = 12;
  console.log(images)

  return (
    <div className="flex items-center justify-center pt-10">
      <main className="flex flex-col items-center">
        <SignedOut>
          <p className="text-xl font-bold text-red-500">
            SIGN UP TO SEE THIS GALLERY!!!!
          </p>
        </SignedOut>

        <SignedIn>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-5 md:gap-10 pt-10 md:pt-20">
            {images === null
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-20 w-20 md:h-32 md:w-32 bg-gray-100 rounded-md"
                  />
                ))
              : images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${img}`}
                    alt={`Uploaded image ${i + 1}`}
                    className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-md"
                  />
                ))}
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
