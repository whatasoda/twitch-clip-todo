import { type JSX, splitProps } from "solid-js";
import { styled } from "../../../styled-system/jsx";
import { type InputVariantProps, input } from "../../../styled-system/recipes";

export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size">,
    InputVariantProps {}

export const Input = (props: InputProps) => {
  const [variantProps, inputProps] = splitProps(props, ["size"]);
  return <styled.input class={input(variantProps)} {...inputProps} />;
};
