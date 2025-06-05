"use client";

import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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
import { Link2, Link2Off } from "lucide-react";

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [activeUser, setActiveUser] = useState<
    UserResource | undefined | null
  >();

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<[string, number] | null>(
    null
  );
  const [imageUploaded, setImageUploaded] = useState(false);
  const [overwriteToggle, setOverwriteToggle] = useState<boolean[]>([]);
  const [overwrittenFilename, setOverwrittenFilename] = useState<string[]>([]);

  const [brightness, setBrightness] = useState<number[][]>([]);
  const [contrast, setContrast] = useState<number[][]>([]);
  const [saturation, setSaturation] = useState<number[][]>([]);
  const [opacity, setOpacity] = useState<number[][]>([]);

  const [resX, setResX] = useState<string[]>([]);
  const [resY, setResY] = useState<string[]>([]);
  const [rotation, setRotation] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const { toast } = useToast();

  const index = selectedImage?.[1] ?? 0;

  useEffect(() => {
    if (isSignedIn) {
      setActiveUser(user);
    }
  }, [isSignedIn, user]);

  const initializeDefaults = (count: number) => {
    setBrightness((prev) => mergeDefaults(prev, count, [50]));
    setContrast((prev) => mergeDefaults(prev, count, [50]));
    setSaturation((prev) => mergeDefaults(prev, count, [50]));
    setOpacity((prev) => mergeDefaults(prev, count, [100]));
    setResX((prev) => mergeDefaults(prev, count, "512"));
    setResY((prev) => mergeDefaults(prev, count, "512"));
    setRotation((prev) => mergeDefaults(prev, count, "0"));
    setOutputFormat((prev) => mergeDefaults(prev, count, "png"));
    setOverwriteToggle((prev) => mergeDefaults(prev, count, false));
    setOverwrittenFilename((prev) => mergeDefaults(prev, count, ""));
  };

  function mergeDefaults<T>(
    oldArray: T[],
    newLength: number,
    defaultValue: T
  ): T[] {
    const newArray = [...oldArray];
    while (newArray.length < newLength) {
      newArray.push(defaultValue);
    }
    if (newArray.length > newLength) {
      newArray.length = newLength; // trim if less files now
    }
    return newArray;
  }

  function updateAtIndex<T>(arr: T[], index: number, newValue: T): T[] {
    const copy = [...arr]; //[[50], [50]]
    copy[index] = newValue;
    return copy;
  }

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
      resX: resX.map((x) => parseInt(x)),
      resY: resY.map((y) => parseInt(y)),
      rotationState: rotation.map((r) => parseInt(r)),
      brightness: brightness,
      contrast: contrast,
      saturation: saturation,
      opacity: opacity,
      outputFormat,
    };

    console.log(imageParameters);

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

    console.log(imageParameters);

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

  const handleResChange = (
    dimension: "resX" | "resY",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value;
    const newNum = parseFloat(newValue);
    if (isNaN(newNum) || newNum <= 0) return;

    const setter = dimension === "resX" ? setResX : setResY;
    setter((prev) => {
      const copy = [...prev];
      copy[index] = newValue;
      return copy;
    });
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
                } flex flex-col items-center p-6 bg-white border-4 border-dashed border-blue-100 overflow-y-auto`}
              >
                <div className="text-2xl text-center w-full p-6">
                  Upload Library
                </div>

                <FileUpload
                  onImageChange={(files) => {
                    setImageFiles(files);
                    setImageUploaded(true);

                    if (files.length > 0) {
                      const firstObjectUrl = URL.createObjectURL(files[0]);
                      setSelectedImage([firstObjectUrl, 0]);
                      initializeDefaults(files.length);

                      // Load dimensions for each image and set resX/resY accordingly
                      files.forEach((file, idx) => {
                        const objectUrl = URL.createObjectURL(file);
                        const img = new Image();
                        img.onload = () => {
                          setResX((prev) => {
                            const oldArray = [...prev];
                            oldArray[idx] = img.width.toString();
                            return oldArray;
                          });
                          setResY((prev) => {
                            const copy = [...prev];
                            copy[idx] = img.height.toString();
                            return copy;
                          });
                          URL.revokeObjectURL(objectUrl); // clean up
                        };
                        img.src = objectUrl;
                      });
                    }
                  }}
                  onImageSelect={setSelectedImage}
                />
              </div>

              {/* Image view (right side) */}
              {imageUploaded && selectedImage && selectedImage[0] && (
                <>
                  <div className="md:w-2/3 flex items-center justify-center h-full bg-white border border-blue-100">
                    <div className="h-full p-10">
                      <img
                        src={selectedImage[0]}
                        alt="Uploaded Preview"
                        className="object-cover h-full"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Settings (bottom side) */}
          {imageUploaded && (
            <div className="bg-blue-50 p-6 shadow-md w-full flex-col">
              <div className="px-6 w-full">
                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="gap-x-8">
                    <TabsTrigger value="colors">Colors</TabsTrigger>
                    <TabsTrigger value="scaling">Scaling</TabsTrigger>
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
                              checked={overwriteToggle[index]}
                              onCheckedChange={() =>
                                setOverwriteToggle((prev) =>
                                  updateAtIndex(prev, index, !prev[index])
                                )
                              }
                            />
                          </div>
                          <div className="flex items-center">
                            <Separator
                              orientation="vertical"
                              style={{
                                backgroundColor: "#909090",
                                height: "12px",
                              }}
                            />
                          </div>
                          <div className="flex items-center">
                            {overwriteToggle[index] && (
                              <input
                                className="border"
                                value={overwrittenFilename[index]}
                                onChange={(e) =>
                                  setOverwrittenFilename((prev) =>
                                    updateAtIndex(prev, index, e.target.value)
                                  )
                                }
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap w-full h-full gap-y-4">
                          <div className="flex flex-col md:flex-row gap-x-4 pr-5">
                            <div>
                              <Label>Brightness</Label>
                            </div>
                            <div className="min-w-36 pt-2.5 md:max-w-56">
                              <Slider
                                value={[brightness[index][0] ?? 50]}
                                onValueChange={(val) =>
                                  setBrightness((prev) =>
                                    updateAtIndex(prev, index, val)
                                  )
                                }
                                max={100}
                                step={1}
                              />
                            </div>
                            <div>
                              <Label>{brightness[index] ?? 50}</Label>
                            </div>
                            <Separator
                              orientation="vertical"
                              style={{ backgroundColor: "#909090" }}
                            />
                          </div>

                          <div className="flex flex-col md:flex-row gap-x-4 pr-5">
                            <div>
                              <Label>Contrast</Label>
                            </div>
                            <div className="min-w-36 pt-2.5 md:max-w-56">
                              <Slider
                                value={[contrast[index]?.[0] ?? 50]}
                                onValueChange={(val) =>
                                  setContrast((prev) =>
                                    updateAtIndex(prev, index, val)
                                  )
                                }
                                max={100}
                                step={1}
                              />
                            </div>
                            <div>
                              <Label>{contrast[index] ?? 50}</Label>
                            </div>
                            <Separator
                              orientation="vertical"
                              style={{ backgroundColor: "#909090" }}
                            />
                          </div>

                          <div className="flex flex-col md:flex-row gap-x-4 pr-5">
                            <div>
                              <Label>Saturation</Label>
                            </div>
                            <div className="min-w-36 pt-2.5 md:max-w-56">
                              <Slider
                                value={[saturation[index]?.[0] ?? 50]}
                                onValueChange={(val) =>
                                  setSaturation((prev) =>
                                    updateAtIndex(prev, index, val)
                                  )
                                }
                                max={100}
                                step={1}
                              />
                            </div>
                            <div>
                              <Label>{saturation[0][index] ?? 50}</Label>
                            </div>
                            <Separator
                              orientation="vertical"
                              style={{ backgroundColor: "#909090" }}
                            />
                          </div>

                          <div className="flex flex-col md:flex-row gap-x-4 pr-5">
                            <div>
                              <Label>Opacity</Label>
                            </div>
                            <div className="min-w-36 pt-2.5 md:max-w-56">
                              <Slider
                                value={[opacity[index]?.[0] ?? 50]}
                                onValueChange={(val) =>
                                  setOpacity((prev) =>
                                    updateAtIndex(prev, index, val)
                                  )
                                }
                                max={100}
                                step={1}
                              />
                            </div>
                            <div>
                              <Label>{opacity[index] ?? 100}</Label>
                            </div>
                            <Separator
                              orientation="vertical"
                              style={{ backgroundColor: "#909090" }}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="scaling">
                      <div className="flex flex-wrap items-center gap-4 p-4">
                        <div className="flex flex-col">
                          <Label>Resolution (Width)</Label>
                          <Input
                            value={resX[index]}
                            onChange={(e) => handleResChange("resX", e)}
                          />
                        </div>
                        X
                        <div className="flex flex-col">
                          <Label>Resolution (Height)</Label>
                          <Input
                            value={resY[index]}
                            onChange={(e) => handleResChange("resX", e)}
                          />
                        </div>
                        <div className="flex flex-col">
                          <Label>Rotation (°)</Label>
                          <Input
                            value={rotation[index]}
                            onChange={(e) =>
                              setRotation((prev) =>
                                updateAtIndex(prev, index, e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="format">
                      <div className="flex flex-col p-4 gap-4">
                        <Label>Output Format</Label>
                        <Select
                          value={outputFormat[index]}
                          onValueChange={(e) =>
                            setOutputFormat((prev) =>
                              updateAtIndex(prev, index, e)
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="jpg">JPG</SelectItem>
                            <SelectItem value="jpeg">JPEG</SelectItem>
                            <SelectItem value="webp">WEBP</SelectItem>
                            <SelectItem value="tiff">TIFF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    <Button style={{ backgroundImage: "var(--gradient)" }}>
                      Save & Upload <Upload />
                    </Button>
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
