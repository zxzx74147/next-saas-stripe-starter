import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Video, CreditCard, Settings, Film } from "lucide-react";

export const metadata = constructMetadata({
  title: "Dashboard – SaaS Starter",
  description: "Create and manage content.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <>
      <DashboardHeader
        heading="Dashboard"
        text={`Welcome back, ${user?.name || "User"}. What would you like to do today?`}
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Projects</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Create Videos</div>
            <p className="text-xs text-muted-foreground mt-1">
              Create and manage your video projects
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/video-projects" className="w-full">
              <Button className="w-full">
                Go to Video Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Library</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Browse Videos</div>
            <p className="text-xs text-muted-foreground mt-1">
              View and manage your generated videos
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/video-library" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Video Library
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Credits</div>
            <p className="text-xs text-muted-foreground mt-1">
              View your credit balance and usage
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/billing" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Billing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Settings</div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/settings" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
