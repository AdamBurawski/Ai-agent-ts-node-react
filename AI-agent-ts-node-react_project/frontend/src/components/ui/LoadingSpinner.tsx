import React from "react";
import "./LoadingSpinner.scss";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  color?: "primary" | "secondary" | "white";
  message?: string;
  overlay?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  color = "primary",
  message,
  overlay = false,
  className,
}) => {
  const spinnerClasses = [
    "loading-spinner",
    `loading-spinner--${size}`,
    `loading-spinner--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <div className={spinnerClasses}>
      <div className="loading-spinner__container">
        <div className="loading-spinner__spinner">
          <div className="loading-spinner__circle"></div>
          <div className="loading-spinner__circle"></div>
          <div className="loading-spinner__circle"></div>
          <div className="loading-spinner__circle"></div>
        </div>
        {message && <div className="loading-spinner__message">{message}</div>}
      </div>
    </div>
  );

  if (overlay) {
    return <div className="loading-spinner__overlay">{content}</div>;
  }

  return content;
};

// Convenience components
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingSpinner overlay message={message} />
);

export const SmallSpinner: React.FC<{
  color?: LoadingSpinnerProps["color"];
}> = ({ color }) => <LoadingSpinner size="small" color={color} />;

export const LargeSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingSpinner size="large" message={message} />
);

export default LoadingSpinner;
