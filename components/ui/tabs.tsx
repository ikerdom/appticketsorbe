import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("w-full", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid w-full grid-cols-3 rounded-md bg-muted p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-4", className)} {...props} />;
}

