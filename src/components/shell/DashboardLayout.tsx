import { Outlet } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { Loader } from "@/components/mission/Loader";
import { BackgroundLayer } from "./BackgroundLayer";
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
      <BackgroundLayer />
      <AnimatePresence>{booting && <Loader onDone={finishBoot} />}</AnimatePresence>
      {!booting && (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </>
  );
}
