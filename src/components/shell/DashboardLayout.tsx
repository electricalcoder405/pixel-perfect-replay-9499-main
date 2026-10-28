import { Outlet } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { Loader } from "@/components/mission/Loader";
import { Starfield } from "@/components/mission/Starfield";
import { AppShell } from "./AppShell";

/** The boot sequence plays once per page load, not on every navigation inside the dashboard. */
let bootPlayed = false;

export function DashboardLayout() {
  const [booting, setBooting] = useState(!bootPlayed);
  const finishBoot = useCallback(() => {
    bootPlayed = true;
    setBooting(false);
  }, []);

  return (
    <>
      <Starfield />
      <AnimatePresence>{booting && <Loader onDone={finishBoot} />}</AnimatePresence>
      {!booting && (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </>
  );
}
