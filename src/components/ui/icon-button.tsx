import { type JSX, splitProps } from "solid-js";
import { styled } from "../../../styled-system/jsx";
import { type ButtonVariantProps, button } from "../../../styled-system/recipes";

export interface IconButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  "aria-label": string;
}

export const IconButton = (props: IconButtonProps) => {
  const [variantProps, buttonProps] = splitProps(props, ["variant", "size"]);
  return (
    <styled.button
      class={button({ ...variantProps, size: variantProps.size ?? "md" })}
      {...buttonProps}
    />
  );
};
