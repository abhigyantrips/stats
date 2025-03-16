import { FC } from "hono/jsx";

interface ErrorSVGProps {
  message: string;
}

export const ErrorSVG: FC<ErrorSVGProps> = ({ message }) => {
  return (
    <svg
      width="400"
      height="100"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 100"
    >
      <rect width="100%" height="100%" fill="#ffeeee" />
      <text x="20" y="50" font-size="16" fill="#cc0000">
        Error: {message}
      </text>
    </svg>
  );
};
