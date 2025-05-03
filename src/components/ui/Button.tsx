import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseStyles = 'flex items-center justify-center rounded-md focus:outline-none transition-all duration-200';
  
  const variantStyles = {
    primary: 'bg-black text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-400',
    secondary: 'bg-gray-200 text-black hover:bg-gray-300 focus:ring-2 focus:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400',
    link: 'text-gray-700 underline hover:text-black p-0 focus:ring-0',
  };
  
  const sizeStyles = {
    sm: 'text-xs py-1 px-2 space-x-1',
    md: 'text-sm py-2 px-4 space-x-2',
    lg: 'text-base py-3 px-6 space-x-3',
  };
  
  const buttonClasses = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${loading ? 'opacity-70 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <motion.button
      className={buttonClasses}
      disabled={loading || props.disabled}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </motion.button>
  );
};

export default Button;