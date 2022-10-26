import { Link } from "@remix-run/react";
import TammLogo from "~/images/svg/TammLogo";

export default function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-6 p-6">
      <Link
        to={"/"}
        className="border-b-4 border-solid border-transparent hover:border-orange-400"
      >
        <TammLogo style={{ height: "clamp(1rem, 8vw, 3rem)", width: "auto" }} />
      </Link>
      &copy; Copyright Tamm Sjödin 2022
    </footer>
  );
}
