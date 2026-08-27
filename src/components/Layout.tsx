/* Layout Component - A component that wraps the main content of the app
   - Use this file to add a header, footer, or other elements that should be present on every page
   - This component is used in the App.tsx file to wrap the main content of the app */

import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <main className="flex flex-col min-h-screen">
      <Outlet />
    </main>
  )
}
