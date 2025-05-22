"use client";

import FileUpload from "@/components/FileUpload";
import { Slider } from "@/components/ui/slider";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

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
      <main className="flex flex-col px-48 pt-8 w-full items-center">
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>

        <SignedIn>
          {/* Upload Section */}
          <div className="shadow-md w-full">
            <div className={`flex flex-row w-full`}>
              {/* Left: Title + Upload */}
              <div
                className={`${
                  imageUploaded ? "md:w-1/3" : "w-full"
                } flex flex-col items-center p-6 bg-gray-100`}
              >
                <div className="text-2xl text-center w-full p-6">
                  Upload Library
                </div>

                <FileUpload
                  onImageChange={(base64Images) => {
                    setImages(base64Images);
                    setImageUploaded(true);
                    if (selectedImage === "") {
                      const firstImage =
                        base64Images.size > 0
                          ? base64Images.entries().next().value
                          : undefined;
                      setSelectedImage(firstImage ? firstImage[1] : "");
                    }
                  }}
                  onImageSelect={setSelectedImage}
                />
              </div>

              {/* Right: Image Preview */}
              {imageUploaded && (
                <div className="md:w-2/3 flex items-center justify-center bg-gray-900/85 bg-gradient-to-tr">
                  <div className="w-full md:w-1/2 h-[60vh] flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Uploaded Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2.1 Toolbar + Parameters */}
          {imageUploaded && (
            <div className="bg-gray-200 p-6 shadow-md w-full flex-col">
              <div className="pl-12">
                {/* Toolbar */}
                <Tabs defaultValue="colors" className="w-[400px]">
                  <TabsList className="gap-x-8">
                    <TabsTrigger value="colors">Colors</TabsTrigger>
                    <TabsTrigger value="format">Format</TabsTrigger>
                  </TabsList>
                  <Separator />
                  <TabsContent value="colors">
                    <form
                      onSubmit={handleSubmit}
                      className="w-full px-14 md:px-0 flex flex-row gap-x-8"
                    >
                      <div className="flex flex-row gap-2">
                        <Label className="">Overwrite Filename</Label>
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
                      <div className="flex flex-col md:flex-row gap-x-8">
                        <div>
                          <Label>Brightness</Label>
                        </div>
                        <div className="min-w-36 pt-2.5 md:max-w-56">
                          <Slider
                            defaultValue={[50]}
                            max={100}
                            step={1}
                            value={brightness}
                            onValueChange={setBrightness}
                          />
                        </div>
                        <div>
                          <Label>{brightness}</Label>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-x-8">
                        <div>
                          <Label className="">Contrast</Label>
                        </div>
                        <div className="min-w-36 pt-2.5 md:max-w-56">
                          <Slider
                            defaultValue={[50]}
                            max={100}
                            step={1}
                            value={contrast}
                            onValueChange={setContrast}
                          />
                        </div>
                        <div>
                          <Label>{contrast}</Label>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-x-8">
                        <div>
                          <Label className="">Saturation</Label>
                        </div>
                        <div className="min-w-36 pt-2.5 md:max-w-56">
                          <Slider
                            defaultValue={[50]}
                            max={100}
                            step={1}
                            value={saturation}
                            onValueChange={setSaturation}
                          />
                        </div>
                        <div>
                          <Label>{saturation}</Label>
                        </div>
                      </div>
                      <Button className="flex flex-row">
                        Save & Upload <Upload></Upload>
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="format">TODO</TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SignedIn>
      </main>
    </div>
  );
}
