// ref as a prop: fine on React 19, but React 18 strips ref from props, so ref.current stays null.
export default function Button({ ref, variant = 'primary', size = 'medium', type = 'button', className, ...props }) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={classes} {...props} />;
}
