import { forwardRef } from 'react';

const Button = forwardRef(function Button({ variant, className, ...props }, ref) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  return <button ref={ref} className={classes} {...props} />;
});

Button.defaultProps = {
  variant: 'primary',
  type: 'button',
};

export default Button;
