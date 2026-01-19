import { type JSX, splitProps } from "solid-js";
import { styled } from "../../../styled-system/jsx";
import { type ButtonVariantProps, button } from "../../../styled-system/recipes";

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

export const Button = (props: ButtonProps) => {
  const [variantProps, buttonProps] = splitProps(props, ["variant", "size"]);
  return (
    <styled.button
      class={button(variantProps)}
      {...buttonProps}
    />
  );
};
