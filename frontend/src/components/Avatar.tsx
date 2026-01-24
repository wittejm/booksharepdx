interface AvatarProps {
  src?: string;
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-5 h-5 text-xs",
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

/**
 * Avatar - Displays user profile picture or fallback initial
 */
export default function Avatar({
  src,
  username,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium ${className}`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
