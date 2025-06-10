import * as React from "react";
import "./alert.scss";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={`alert alert-${variant} ${className}`}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = "", ...props }, ref) => (
    <h5 ref={ref} className={`alert-title ${className}`} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

interface AlertDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`alert-description ${className}`} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
