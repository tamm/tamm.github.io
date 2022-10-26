import { useTransition } from "@remix-run/react";
import { useEffect, useRef } from "react";

import type { MutableRefObject, ReactElement } from "react";

export function useProgress(): MutableRefObject<HTMLDivElement> {
  const el = useRef<HTMLDivElement | undefined>();
  const timeout = useRef<NodeJS.Timeout>();
  const { location } = useTransition();

  useEffect(() => {
    if (!location || !el.current) {
      return;
    }

    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    const current = el.current;
    current.style.width = `0%`;

    let updateWidth = (ms: number) => {
      timeout.current = setTimeout(() => {
        let width = parseFloat(current.style.width);
        let percent = !isNaN(width) ? 10 + 0.9 * width : 0;

        current.style.width = `${percent}%`;
        console.log(timeout.current, current.style.width);

        updateWidth(100);
      }, ms);
    };

    updateWidth();

    return () => {
      clearTimeout(timeout.current);

      if (current.style.width === `0%`) {
        return;
      }

      current.style.width = `100%`;

      timeout.current = setTimeout(() => {
        if (current.style.width !== "100%") {
          return;
        }

        current.style.width = ``;
      }, 150);
    };
  }, [location]);

  return el;
}

function LoadingBar(): ReactElement {
  const progress = useProgress();

  return (
    <div className="fixed top-0 left-0 right-0 flex h-1">
      <div
        ref={progress}
        className="bg-gradient-to-r from-orange-400 via-orange-600 to-transparent transition-all ease-out"
      />
    </div>
  );
}

export default LoadingBar;
