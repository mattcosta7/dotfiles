import { forwardRef } from 'react';

// forwardRef stays: the peer range includes React 18, where ref is not a prop.
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'medium', type = 'button', className, ...props },
  ref,
) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={classes} {...props} />;
});

export default Button;
