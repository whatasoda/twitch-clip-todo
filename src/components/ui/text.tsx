import { type JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { styled } from "../../../styled-system/jsx";
import { type TextVariantProps, text } from "../../../styled-system/recipes";

type TextElement = "p" | "span" | "div" | "label" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "kbd";

export interface TextProps
  extends JSX.HTMLAttributes<HTMLElement>,
    TextVariantProps {
  as?: TextElement;
}

export const Text = (props: TextProps) => {
  const [variantProps, textProps] = splitProps(props, ["size", "variant", "as"]);
  const element = () => variantProps.as ?? "p";
  return (
    <Dynamic
      component={styled[element()]}
      class={text({ size: variantProps.size, variant: variantProps.variant })}
      {...textProps}
    />
  );
};
