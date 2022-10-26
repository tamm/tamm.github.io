import { Link } from "@remix-run/react";
import GitHubLogo from "~/images/svg/GithubLogo";
import IconMenu from "~/images/svg/IconMenu";
import LinkedInLogo from "~/images/svg/LinkedinLogo";
import TammLogo from "~/images/svg/TammLogo";

export default function Navigation() {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-6 p-6">
      <Link
        to={"/"}
        className="border-b-4 border-solid border-transparent hover:border-orange-400"
      >
        <TammLogo style={{ height: "clamp(3rem, 8vw, 5rem)", width: "auto" }} />
      </Link>
      <button
        id="smallScreenNavToggleButton"
        className="flex items-center gap-6 p-6 hover:bg-orange-400 md:hidden"
      >
        <span className="hidden sm:inline-flex">Open menu</span>
        <span className="hidden">Close menu</span>
        <IconMenu
          aria-hidden
          style={{ height: "clamp(1rem, 5vw, 2rem)", width: "auto" }}
          className="stroke-black dark:stroke-white"
        />
      </button>
      <div
        id="smallScreenNavMenu"
        className="hidden w-full flex-grow justify-end gap-6 md:flex md:w-auto md:items-center"
      >
        {process.env.NODE_ENV === "development" && (
          <Link
            to={"posts/admin"}
            className="block p-6 text-orange-400 underline hover:bg-orange-400 hover:text-black md:inline md:rounded-md md:p-1"
          >
            Admin
          </Link>
        )}{" "}
        <Link
          to={"posts"}
          className="block p-6 text-orange-400 underline hover:bg-orange-400 hover:text-black md:inline md:rounded-md md:p-1"
        >
          Post archive
        </Link>
        <a
          href="https://github.com/tamm"
          className="flex items-center justify-between p-6 hover:bg-orange-400 md:block md:inline md:rounded-full md:p-1"
          title="Visit my GitHub"
        >
          <span className="text-orange-400 underline md:hidden">GitHub</span>
          <GitHubLogo
            style={{
              height: "clamp(1rem, 5vw, 3rem)",
              width: "auto",
            }}
            className="inline-flex justify-self-end dark:fill-white"
          />
        </a>
        <a
          href="https://www.linkedin.com/in/tigresstamm/"
          className="flex items-center justify-between p-6 hover:bg-orange-400 md:block md:inline md:rounded-full md:p-1"
          title="Visit my LinkedIn profile"
        >
          <span className="text-orange-400 underline md:hidden">LinkedIn</span>
          <span className="flex justify-end gap-6">
            <LinkedInLogo
              style={{ height: "clamp(1rem, 5vw, 3rem)", width: "auto" }}
              className="inline-flex justify-self-end dark:fill-white md:hidden"
            />
            <img
              alt="LinkedIn"
              className="inline-flex justify-self-end rounded-full"
              style={{ height: "clamp(1rem, 5vw, 3rem)", width: "auto" }}
              src="https://avatars.githubusercontent.com/u/803930?v=4"
            />
          </span>
        </a>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('smallScreenNavToggleButton').onclick = (event) => {
                document.getElementById('smallScreenNavToggleButton').querySelectorAll('span').forEach((span)=>span.classList.toggle('sm:inline-flex'));
                document.getElementById('smallScreenNavMenu').classList.toggle('hidden');
            }
          });
        `,
        }}
      />
    </nav>
  );
}
