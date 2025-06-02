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
import { uploadImageMetaData } from "@/lib/actions";
import { ImageMetaData } from "@/types/ImageMetaData";
import { ImageParameters } from "@/types/ImageParameters";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [opacity, setOpacity] = useState([50]);

  const [progress, setProgress] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    if (isSignedIn) {
      setActiveUser(user);
    }
  }, [isSignedIn, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setProgress(1);

    if (!activeUser?.id) {
      toast({ variant: "destructive", title: "User not authenticated" });
      return;
    }

    const uploadId = uuidv4();
    const imageNames = imageFiles.map((file) => uuidv4() + "_" + file.name);

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
      uploadId,
      user: activeUser.id,
      imageName: imageNames,
      startTime: getFormattedDate(),
      imageParameters,
    };

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(imageMetaData)], { type: "application/json" })
    );
    imageFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      imageMetaData.imageName = result.uploadedFiles.map(
        (file: any) => file.s3Key
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description:
          "An error occurred uploading your images to S3. Please try again.",
      });
      return;
    }

    setProgress(30);

    try {
      await uploadImageMetaData(imageMetaData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Metadata Upload Failed",
        description:
          "An error occurred saving metadata to DynamoDb. Please try again.",
      });
      return;
    }

    setProgress(60);

    try {
      const response = await fetch(
        "https://9v6q30w9i6.execute-api.eu-central-1.amazonaws.com/ImageProcessing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(imageMetaData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lambda processing failed");
      }

      toast({
        title: "Upload Complete",
        description: "Image uploaded, metadata saved, and processing started.",
        duration: 5000,
      });
      setProgress(100);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "Image upload succeeded, but processing failed.",
      });
    }
  };

  const getFormattedDate = () => {
    const now = new Date();
    return `${now.getDate()}.${
      now.getMonth() + 1
    }.${now.getFullYear()}_${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  };

  return (
    <div className="flex justify-center min-h-screen w-full">
      <main className="flex flex-col px-48 pt-8 w-full items-center">
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>

        <SignedIn>
          <div className="shadow-md w-full">
            <div className={`flex flex-row w-full h-96`}>
              {/* File upload component */}
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
                    const files = Array.from(filesMap.values());
                    setImageFiles(files);
                    setImageUploaded(true);
                    if (selectedImage === "" && files.length > 0) {
                      setSelectedImage(URL.createObjectURL(files[0]));
                    }
                  }}
                  onImageSelect={setSelectedImage}
                />
              </div>

              {/* Image view (right side) */}
              {imageUploaded && (
                <>
                  <Card className="md:w-2/3 flex items-center justify-center h-full">
                    <CardContent className="h-full p-10">
                      <img
                        src={selectedImage}
                        alt="Uploaded Preview"
                        className="object-cover h-full"
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Settings (bottom side) */}
          {imageUploaded && (
            <div className="bg-gray-200 p-6 shadow-md w-full flex-col">
              <div className="px-6">
                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="gap-x-8">
                    <TabsTrigger value="colors">Colors</TabsTrigger>
                    <TabsTrigger value="format">Format</TabsTrigger>
                  </TabsList>
                  <form onSubmit={handleSubmit} className="w-full">
                    <TabsContent value="colors">
                      <div className="flex flex-wrap flex-row p-4 my-2">
                          <div className="flex flex-row gap-x-3">
                            <div className="flex items-center">
                              <Label>Overwrite Filename</Label>
                            </div>
                            <div className="flex items-center">
                              <Checkbox
                                checked={overwriteToggle}
                                onCheckedChange={setOverwriteToggle}
                              />
                            </div>
                            <div className="flex items-center">
                            <Separator orientation="vertical" style={{ backgroundColor: "#909090", height:"12px" }} />
                            </div>
                            <div className="flex items-center">
                              {overwriteToggle && (
                                <input
                                  className="border"
                                  value={overwrittenFilename}
                                  onChange={(e) =>
                                    setOverwrittenFilename(e.target.value)
                                  }
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex w-full h-full">
                          {[
                            {
                              label: "Brightness",
                              value: brightness,
                              setter: setBrightness,
                            },
                            {
                              label: "Contrast",
                              value: contrast,
                              setter: setContrast,
                            },
                            {
                              label: "Saturation",
                              value: saturation,
                              setter: setSaturation,
                            },
                            {
                              label: "Opacity",
                              value: opacity,
                              setter: setOpacity,
                            },
                          ].map(({ label, value, setter }) => (
                            <div
                              key={label}
                              className="flex flex-col md:flex-row gap-x-4 pr-5"
                            >
                              <div>
                                <Label>{label}</Label>
                              </div>
                              <div className="min-w-36 pt-2.5 md:max-w-56">
                                <Slider
                                  defaultValue={[50]}
                                  max={100}
                                  step={1}
                                  value={value}
                                  onValueChange={setter}
                                />
                              </div>
                              <div>
                                <Label>{value}</Label>
                              </div>
                              <Separator orientation="vertical"	style={{ backgroundColor: "#909090" }}/>
                            </div>
                          ))}
                          </div>
                      </div>
                      <Button style={{ backgroundImage: "var(--gradient)" }}>
                        Save & Upload <Upload />
                      </Button>
                    </TabsContent>
                    <TabsContent value="format">TODO</TabsContent>
                  </form>
                </Tabs>
              </div>
            </div>
          )}
          {progress != 0 && <Progress value={progress} />}
          <Toaster />
        </SignedIn>
      </main>
    </div>
  );
}
