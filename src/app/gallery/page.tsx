"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchImage, deleteImageData } from "@/lib/actions";
import { RefreshCw, X, Trash2, Download } from "lucide-react";
import { imageResults } from "@/types/imageResults";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [images, setImages] = useState<string[] | null>(null);
  const [editedNames, setEditedNames] = useState<string[] | null>(null);
  const [originalToEdited, setOriginalToEdited] = useState<Map<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  const getExtension = (fileName: string): string => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  };

  const loadImages = async () => {
    try {
      if (!isLoaded || !user?.id) return;

      const response = await fetchImage(user.id);
      const imageResults: imageResults = response?.imageResults ?? {
        imageNames: [],
        imageContent: [],
        imageNameOverwrite: [],
      };
      console.log("Fetched imageResults:", imageResults);

      if (imageResults.imageNames.length === 0) {
        setImages(null);
        setEditedNames(null);
        setOriginalToEdited(null);
        return;
      }

      // imageResults is an object with arrays, so just extract arrays:
      const originalNames = imageResults.imageNames; // string[]
      const edited = imageResults.imageNameOverwrite.map((name, i) =>
        name === "" || name === undefined ? originalNames[i] : name
      ); // string[]

      // Map editedName -> originalName
      const mapping = new Map<string, string>();
      for (let i = 0; i < originalNames.length; i++) {
        mapping.set(edited[i], originalNames[i]);
      }

      setImages(imageResults.imageContent); // string[]
      setEditedNames(edited);
      setOriginalToEdited(mapping);
    } catch (err) {
      console.error("Image fetch error:", err);
      setImages(null);
      setEditedNames(null);
      setOriginalToEdited(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [isLoaded, user?.id]);

  const refresh = async () => {
    setSpinning(true);
    await loadImages();
    setSpinning(false);
  };

  const handleDelete = async () => {
    if (
      activeIndex === null ||
      !editedNames ||
      !originalToEdited ||
      !editedNames[activeIndex]
    )
      return;

    const editedName = editedNames[activeIndex];
    const originalName = originalToEdited.get(editedName);
    if (!originalName) return;

    try {
      await deleteImageData(originalName);
      await loadImages();
      setActiveImage(null);
      setActiveIndex(null);
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
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
                <RefreshCw
                  className={`text-white ${spinning ? "animate-spin" : ""}`}
                />
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
            ) : images && images.length > 0 && editedNames ? (
              images.map((img, i) => (
                <div key={i} className="flex flex-col">
                  <img
                    src={`data:image/${getExtension(
                      editedNames[i]
                    )};base64,${img}`}
                    alt={`Uploaded image ${i + 1}`}
                    title={editedNames[i]}
                    onClick={() => {
                      setActiveImage(img);
                      setActiveIndex(i);
                    }}
                    className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                  />
                  <label title={editedNames[i]}>
                    {editedNames[i].length > 14
                      ? editedNames[i].substring(0, 16) + "..."
                      : editedNames[i]}
                  </label>
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

      {/* Enlarged Modal */}
      {activeImage && editedNames && activeIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="relative">
            {/* Buttons */}
            <div className="absolute top-2 right-2 flex gap-4 z-10">
              {/* DELETE */}
              <button
                onClick={handleDelete}
                className="text-white hover:text-red-500 transition"
                title="Delete Image"
              >
                <Trash2 />
              </button>

              {/* Download */}
              <a
                href={`data:image/${getExtension(
                  editedNames[activeIndex]
                )};base64,${activeImage}`}
                download={editedNames[activeIndex]}
                className="text-white hover:text-blue-400 transition"
                title="Download Image"
              >
                <Download />
              </a>

              {/* Close */}
              <button
                onClick={() => {
                  setActiveImage(null);
                  setActiveIndex(null);
                }}
                className="text-white hover:text-gray-300 transition"
                title="Close"
              >
                <X size={28} />
              </button>
            </div>

            {/* Enlarged Image */}
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
