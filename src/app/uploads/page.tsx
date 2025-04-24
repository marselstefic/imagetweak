"use client";

import FileUpload from "@/components/FileUpload";
import { Slider } from "@/components/ui/slider";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator"

export default function Home() {
  const [brightness, setBrightness] = useState([50]);
  const [contrast, setContrast] = useState([50]);
  const [saturation, setSaturation] = useState([50]);
  const [overwriteToggle, setOverwriteToggle] = useState(false);
  const [overwrittenFilename, setOverwrittenFilename] = useState("");
  const [images, setImages] = useState<Map<string, string>>(new Map());
  const [selectedImage, setSelectedImage] = useState("");

  const [imageUploaded, setImageUploaded] = useState<boolean>(false); // Track if an image is uploaded

  type imageData = {
    overwrittenFilename: string;
    image: Object;
    resX: number;
    resY: number;
    rotationState: number;
    brightness: number;
    contrast: number;
    saturation: number;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const imageParametersExample: imageData = {
      overwrittenFilename: overwrittenFilename,
      image: Object.fromEntries(images),
      resX: 2,
      resY: 2,
      rotationState: 2,
      brightness: brightness[0],
      contrast: contrast[0],
      saturation: saturation[0],
    };
    console.log("images: " + images);

    fetch(
      "https://9v6q30w9i6.execute-api.eu-central-1.amazonaws.com/ImageProcessing",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageParametersExample),
      }
    );
  };

  return (
    <div className="flex justify-center min-h-screen w-full">
      <main className="flex flex-col p-20 pt-8 w-full items-center gap-16">
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>
        <SignedIn>
          <div className="bg-gray-200 rounded-xl pt-6 shadow-md w-full flex-col">
            {/* Conditional Layout */}
            <div
              className={`flex px-56 min-h-80 items-center justify-between transition-all duration-300 ease-in-out ${
                imageUploaded ? "flex-row" : "flex-col"
              }`}
            >
              {/* Left Side (Controls and Upload) */}
              <div
                className={`flex flex-col w-full ${
                  imageUploaded ? "w-1/2" : "w-full"
                } space-y-4 justify-center items-center`}
              >
                {/* FileUpload Component */}
                <div className="mb-4 text-center">
                  <FileUpload
                    onImageChange={(base64Images) => {
                      setImages(base64Images);
                      setImageUploaded(true);
                      if (selectedImage == "") {
                        const firstImage =
                          base64Images.size > 0
                            ? base64Images.entries().next().value
                            : undefined;
                        setSelectedImage(firstImage ? firstImage[1] : "");
                      }
                    }}
                    onImageSelect={(selectedImage) => {
                      setSelectedImage(selectedImage)
                    }}
                  />
                </div>

                {/* Parameters */}
                {imageUploaded && (
                  <>
                  {/* Toolbar */}
                    <Tabs defaultValue="colors" className="w-[400px]">
                      <TabsList>
                        <TabsTrigger value="colors">Colors</TabsTrigger>
                        <TabsTrigger value="format">Format</TabsTrigger>
                      </TabsList>
                      <Separator />
                      <TabsContent value="colors">
                        <form
                          onSubmit={handleSubmit}
                          className="space-y-4 w-full"
                        >
                          <div className="flex flex-row gap-2">
                            <p className="">Overwrite Filename:</p>
                            <Switch
                              checked={overwriteToggle}
                              onCheckedChange={setOverwriteToggle}
                            />
                            {overwriteToggle && (
                              <input
                                className="border"
                                value={overwrittenFilename}
                                onChange={(e) => {
                                  setOverwrittenFilename(e.target.value);
                                }}
                              />
                            )}
                          </div>
                          <div className="flex flex-row gap-2">
                            <p className="">Brightness:</p>
                            <Slider
                              className="pt-2"
                              defaultValue={[50]}
                              max={100}
                              step={1}
                              value={brightness}
                              onValueChange={setBrightness}
                            />
                            <p>{brightness}</p>
                          </div>
                          <div className="flex flex-row gap-2">
                            <p className="">Contrast:</p>
                            <Slider
                              className="pt-2"
                              defaultValue={[50]}
                              max={100}
                              step={1}
                              value={contrast}
                              onValueChange={setContrast}
                            />
                            <p>{contrast}</p>
                          </div>
                          <div className="flex flex-row gap-2">
                            <p className="">Saturation:</p>
                            <Slider
                              className="pt-2"
                              defaultValue={[50]}
                              max={100}
                              step={1}
                              value={saturation}
                              onValueChange={setSaturation}
                            />
                            <p>{saturation}</p>
                          </div>
                          <button className="mt-4">Submit</button>
                        </form>
                      </TabsContent>
                      <TabsContent value="format">TODO</TabsContent>
                    </Tabs>
                  </>
                )}
              </div>

              {/* Right Side (Image Preview) */}
              {imageUploaded && (
                <div className="flex flex-col w-1/2 items-center justify-center">
                  <div className="w-full h-80 rounded-lg overflow-hidden items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Uploaded Preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
