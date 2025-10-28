import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user?.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Arno Cosmetics Inventory Management System
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>You are logged in as</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Name:</span> {userData?.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Email:</span> {userData?.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Role:</span>{" "}
                {userData?.role.replace("_", " ")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>System overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Statistics will be available after Phase 02 implementation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity tracking will be available in future phases
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Next steps to set up your system</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Set up locations (HQ and branches) - Phase 02</li>
            <li>Add suppliers and products - Phase 02</li>
            <li>Create purchase orders - Phase 03-04</li>
            <li>Manage inventory and transfers - Phase 05-06</li>
            <li>Record sales transactions - Phase 05-06</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
