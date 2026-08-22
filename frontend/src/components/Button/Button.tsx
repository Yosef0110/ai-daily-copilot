import type { ReactNode } from "react";
import "./Button.css"

interface ButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  className? : string;
  backgroundColor?: string;
  disabled? : boolean;
  color?: string;
  onClick?: () => void;
}

const Button = ({backgroundColor, className = "",color , children, icon, disabled, onClick}: ButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: color,
        backgroundColor: backgroundColor,
      }}
      className={className + ' custom-button'}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;