"use client";

import FileUpload from "@/components/FileUpload";
import { Slider } from "@/components/ui/slider";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";

export default function Home() {
  const [brightness, setBrightness] = useState([50]);
  const [contrast, setContrast] = useState([50]);
  const [saturation, setSaturation] = useState([50]);
  const [overwriteToggle, setOverwriteToggle] = useState(false)
  const [overwrittenFilename, setOverwrittenFilename] = useState("")
  const [images, setImages] = useState<Map<string, string>>(new Map());

  type imageData = {
    overwrittenFilename: string,
    image: Map<string, string>,
    resX: number,
    resY: number,
    rotationState: number,
    brightness: number,
    contrast: number,
    saturation: number,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const imageParametersExample: imageData = {overwrittenFilename: overwrittenFilename, image: images, resX: 2, resY: 2, rotationState: 2, brightness: brightness[0], contrast: contrast[0], saturation: saturation[0]}

    fetch('https://9v6q30w9i6.execute-api.eu-central-1.amazonaws.com/ImageProcessing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageParametersExample),
    });
    
  };

  return (
    <div className="flex justify-center min-h-screen w-full">
      <main className="flex flex-col p-20 pt-8 w-full items-center gap-16">
        {" "}
        {/* Added padding-top to avoid overlap */}
        <SignedOut>SIGN UP TO SEE THIS PAGE!!!!</SignedOut>
        <SignedIn>
          <div className="flex flex-col p-6 bg-gray-200 rounded-xl w-full px-56 min-h-80 shadow-md">
            <div className="mb-4 text-center">
            <FileUpload
              onImageChange={(base64Images) => {
                setImages(base64Images);
              }}
            />
            </div>
            <div className="text-center">
            </div>
          </div>
            <form onSubmit={handleSubmit} className="space-y-4 w-full px-56">
            <div className="flex flex-row gap-2">
                <p className="">Overwrite Filename:</p>
                <input type="checkbox" onChange={(e) => {setOverwriteToggle(e.target.checked)}}></input>
                {overwriteToggle == true &&
                   <input className="border" value={overwrittenFilename} onChange={(e) => {setOverwrittenFilename(e.target.value)}}></input>
                }
              </div>
              <div className="flex flex-row gap-2">
                <p className="">Brightness:</p>
                <Slider className="pt-2" defaultValue={[50]} max={100} step={1} value={brightness} onValueChange={setBrightness}/>
                <p>{brightness}</p>
              </div>
              <div className="flex flex-row gap-2">
                <p className="">Contrast:</p>
                <Slider className="pt-2" defaultValue={[50]} max={100} step={1} value={contrast} onValueChange={setContrast}/>
                <p>{contrast}</p>
              </div>
              <div className="flex flex-row gap-2">
                <p className="">Saturation:</p>
                <Slider className="pt-2" defaultValue={[50]} max={100} step={1} value={saturation} onValueChange={setSaturation}/>
                <p>{saturation}</p>
              </div>
              <button>Submit</button>
            </form>
        </SignedIn>
      </main>
    </div>
  );
}

