import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex flex-col justify-center items-center h-screen w-screen gap-2">
      <Outlet></Outlet>
    </div>
  );
}
