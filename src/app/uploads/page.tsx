"use client";

import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { uploadImage, uploadImageMetaData } from "@/lib/actions";
import { ImageMetaData } from "@/types/ImageMetaData";
import { ImageParameters } from "@/types/ImageParameters";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [activeUser, setActiveUser] = useState<
    UserResource | undefined | null
  >();

  const [imageFiles, setImageFiles] = useState<File[]>([]); 
  const [selectedImage, setSelectedImage] = useState("");
  const [imageUploaded, setImageUploaded] = useState(false);
  const [overwriteToggle, setOverwriteToggle] = useState(false);
  const [overwrittenFilename, setOverwrittenFilename] = useState("");

  const [brightness, setBrightness] = useState([50]);
  const [contrast, setContrast] = useState([50]);
  const [saturation, setSaturation] = useState([50]);

  const { toast } = useToast();

  let uploadSuccessful = false;

  useEffect(() => {
    if (isSignedIn) {
      setActiveUser(user);
    }
  }, [isSignedIn, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    const uploadId = uuidv4();
  
    const imageParameters: ImageParameters = {
      overwrittenFilename,
      resX: 2,
      resY: 2,
      rotationState: 2,
      brightness: brightness[0],
      contrast: contrast[0],
      saturation: saturation[0],
    };
  
    const imageMetaData: ImageMetaData = {
      uploadId: uploadId,
      user: activeUser?.id,
      imageName: imageFiles.map((file) => file.name), // array of filenames
      startTime: getFormattedDate(),
      imageParameters,
    };
  
    try {
      await uploadImageMetaData(imageMetaData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "An error occurred during upload to DynamoDB. Please try again.",
      });
      return;
    }
  
    // Create FormData with all files
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(imageMetaData)], { type: "application/json" }));
    imageFiles.forEach((file) => formData.append("files", file));
  
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const result = await response.json();
      console.log("Backend upload result:", result);
      toast({
        title: "Upload Successful",
        description: "Your image was uploaded to S3 and metadata saved to DynamoDB.",
        duration: 5000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "An error occurred uploading your images. Please try again.",
      });
      return;
    }
  
    // Reset state or do whatever you want next
  };

  const getFormattedDate = () => {
    const now = new Date();
    const [d, m, y, h, min, s] = [
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    ];
    return `${d}.${m}.${y}_${h}:${min}:${s}`;
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
                  onImageChange={(filesMap) => {
                    setImageFiles(Array.from(filesMap.values()));
                    setImageUploaded(true);
                    if (selectedImage === "") {
                      // For preview, generate a URL for the first file
                      const firstFile = filesMap.values().next().value;
                      if (firstFile) {
                        const url = URL.createObjectURL(firstFile);
                        setSelectedImage(url);
                      }
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
                      <Button>
                        Save & Upload <Upload></Upload>
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="format">TODO</TabsContent>
                </Tabs>
              </div>
            </div>
            )}
          <Toaster/>
        </SignedIn>
      </main>
    </div>
  );
}
