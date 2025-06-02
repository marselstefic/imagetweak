"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchImage } from "@/lib/actions";
import { RefreshCw } from 'lucide-react';
import { X } from "lucide-react"; // icon for close button

export default function Home() {
  const { user, isLoaded } = useUser();
  const [images, setImages] = useState<string[] | null>(null);
  const [imageNames, setImageNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);


  const loadImages = async () => {
    try {
      if (!isLoaded || !user?.id) return;
      const result = await fetchImage(user.id);
      console.log(result)
      const originalNames = result ? Array.from(result.keys()) : [];
      const editedNames = originalNames.map((name) => name.split("_")[1]);  
      setImageNames(editedNames);
      setImages(result ? Array.from(result?.values()) : null);
    } catch (err) {
      console.error("Image fetch error:", err);
      setImages(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {    
    loadImages();
  }, [isLoaded, user?.id]);

  const refresh = async () => {
    setSpinning(true);
    await loadImages()
    setSpinning(false)
  };

  const skeletonCount = 12;

  return (
    <div className="flex items-center justify-center pt-10 relative">
      <main className="flex flex-col items-center relative w-full">
        <SignedOut>
          <p className="text-xl font-bold text-red-500">
            SIGN UP TO SEE THIS GALLERY!!!!
          </p>
        </SignedOut>

        <SignedIn>
          <div className="w-10 h-10">
            <button onClick={refresh}>
              <div className="w-10 h-10 top-10 rounded-full bg-gray-300 flex items-center justify-center text-center">
                <RefreshCw className={`text-white ${spinning ? 'animate-spin' : ''}`} />
              </div>
            </button>
          </div>
          <div className="absolute top-20 grid grid-cols-3 md:grid-cols-5 gap-5 md:gap-10 pt-10">
            {loading ? (
              Array.from({ length: skeletonCount }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-20 w-20 md:h-32 md:w-32 bg-gray-100 rounded-md"
                />
              ))
            ) : images && images.length > 0 && imageNames ? (
              images.map((img, i) => (
                  <div className="flex flex-col">
                  <img
                  key={i}
                  src={`data:image/jpeg;base64,${img}`}
                  alt={`Uploaded image ${i + 1}`}
                  title={imageNames[i]}
                  onClick={() => setActiveImage(img)}
                  className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                  />
                <label title={imageNames[i]}>{imageNames[i].length > 14 ? imageNames[i].substring(0, 16) + "..." : imageNames[i]}</label>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500">
                No images uploaded yet.
              </p>
            )}
          </div>
        </SignedIn>
      </main>

      {activeImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-2 right-2 text-white hover:text-red-400 transition"
            >
              <X size={28} />
            </button>
            <img
              src={`data:image/jpeg;base64,${activeImage}`}
              alt="Enlarged preview"
              className="max-w-full max-h-[90vh] rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
