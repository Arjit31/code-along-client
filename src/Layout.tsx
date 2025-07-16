import { Outlet } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAtom } from "jotai";
import { themeAtom } from "./atoms/themeAtom";

export function Layout() {
  const [theme, setTheme] = useAtom(themeAtom);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <div
      className={`flex flex-col justify-center items-center h-screen w-screen gap-2 ${
        theme === "dark"
          ? "bg-neutral-900 text-neutral-50"
          : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <button
        onClick={toggleTheme}
        className={
          theme === "light"
            ? "absolute top-4 left-4 p-2 rounded-full bg-neutral-700 hover:bg-neutral-600 transition"
            : "absolute top-4 left-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition"
        }
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-black" />
        ) : (
          <Moon className="w-5 h-5 text-white" />
        )}
      </button>

      <Outlet />
    </div>
  );
}
