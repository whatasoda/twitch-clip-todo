import { type JSX, splitProps } from "solid-js";
import { styled } from "../../../styled-system/jsx";
import { type BadgeVariantProps, badge } from "../../../styled-system/recipes";

export interface BadgeProps
  extends JSX.HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {}

export const Badge = (props: BadgeProps) => {
  const [variantProps, badgeProps] = splitProps(props, ["variant", "size"]);
  return <styled.span class={badge(variantProps)} {...badgeProps} />;
};
