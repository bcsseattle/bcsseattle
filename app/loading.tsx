import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" className="container mx-auto text-center p-12">
      <Loader2Icon className="animate-spin h-24 w-24 mr-3 text-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
