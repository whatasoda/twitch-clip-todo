import { Collapsible as ArkCollapsible, type CollapsibleRootProps as ArkRootProps } from "@ark-ui/solid/collapsible";
import type { JSX, ParentProps } from "solid-js";
import { collapsible } from "../../../styled-system/recipes";

export interface CollapsibleRootProps extends ArkRootProps {}

const Root = (props: CollapsibleRootProps) => {
  const classes = collapsible();
  return (
    <ArkCollapsible.Root class={classes.root} {...props} />
  );
};

export interface CollapsibleTriggerProps extends ParentProps {
  class?: string;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
}

const Trigger = (props: CollapsibleTriggerProps) => {
  const classes = collapsible();
  return (
    <ArkCollapsible.Trigger class={props.class ?? classes.trigger} onClick={props.onClick}>
      {props.children}
    </ArkCollapsible.Trigger>
  );
};

export interface CollapsibleContentProps extends ParentProps {
  class?: string;
}

const Content = (props: CollapsibleContentProps) => {
  const classes = collapsible();
  return (
    <ArkCollapsible.Content class={props.class ?? classes.content}>
      {props.children}
    </ArkCollapsible.Content>
  );
};

export const Collapsible = {
  Root,
  Trigger,
  Content,
};
