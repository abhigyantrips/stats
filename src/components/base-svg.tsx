import { FC } from "hono/jsx";

interface BaseSVGProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  children: any;
}

export const BaseSVG: FC<BaseSVGProps> = ({
  width = 400,
  height = 200,
  backgroundColor = "#f0f0f0",
  children,
}) => {
  return (
    <svg
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width="100%" height="100%" fill={backgroundColor} />
      {children}
    </svg>
  );
};
