import { type JSX, splitProps } from "solid-js";
import { styled } from "../../../styled-system/jsx";
import { card } from "../../../styled-system/recipes";

interface CardRootProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Root = (props: CardRootProps) => {
  const [localProps, rootProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.div class={classes.root} {...rootProps}>
      {localProps.children}
    </styled.div>
  );
};

interface CardHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Header = (props: CardHeaderProps) => {
  const [localProps, headerProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.div class={classes.header} {...headerProps}>
      {localProps.children}
    </styled.div>
  );
};

interface CardBodyProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Body = (props: CardBodyProps) => {
  const [localProps, bodyProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.div class={classes.body} {...bodyProps}>
      {localProps.children}
    </styled.div>
  );
};

interface CardFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Footer = (props: CardFooterProps) => {
  const [localProps, footerProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.div class={classes.footer} {...footerProps}>
      {localProps.children}
    </styled.div>
  );
};

interface CardTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {}

const Title = (props: CardTitleProps) => {
  const [localProps, titleProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.h3 class={classes.title} {...titleProps}>
      {localProps.children}
    </styled.h3>
  );
};

interface CardDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {}

const Description = (props: CardDescriptionProps) => {
  const [localProps, descProps] = splitProps(props, ["children"]);
  const classes = card();
  return (
    <styled.p class={classes.description} {...descProps}>
      {localProps.children}
    </styled.p>
  );
};

export const Card = {
  Root,
  Header,
  Body,
  Footer,
  Title,
  Description,
};
