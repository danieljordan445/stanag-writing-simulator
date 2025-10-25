import * as React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: Props) {
  return (
    <button
      className={clsx("px-3 py-2 rounded-lg border transition-colors", className)}
      {...props}
    />
  );
}
