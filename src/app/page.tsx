import { SignedIn, SignedOut } from "@clerk/nextjs";
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  const { userId } = await auth()
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <SignedOut>
          SIGN UP TO SEE THIS PAGE!!!!
        </SignedOut>
        <SignedIn>
          <p> {userId} </p>
        </SignedIn>
      </main>
    </div>
  );
}
