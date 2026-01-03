import { FC, PropsWithChildren } from "hono/jsx";

export interface CardProps {
  width: number;
  height: number;
  borderRadius?: number;
  hideBorder?: boolean;
  hideTitle?: boolean;
  title: string;
  colors: {
    titleColor: string;
    textColor: string;
    iconColor: string;
    bgColor: string | string[];
    borderColor: string;
  };
  paddingX?: number;
  paddingY?: number;
  css?: string;
  a11yTitle?: string;
  a11yDesc?: string;
}

export const Card: FC<PropsWithChildren<CardProps>> = ({
  width,
  height,
  borderRadius = 4.5,
  hideBorder = false,
  hideTitle = false,
  title,
  colors,
  children,
  paddingX = 25,
  paddingY = 35,
  css = "",
  a11yTitle = "Card",
  a11yDesc = "Card description",
}) => {
  const { titleColor, bgColor, borderColor } = colors;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="descId"
    >
      <title id="titleId">{a11yTitle}</title>
      <desc id="descId">{a11yDesc}</desc>
      <style>
        {`
          .header {
            font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: ${titleColor};
            animation: fadeInAnimation 0.8s ease-in-out forwards;
          }
          @supports(-moz-appearance: auto) {
            .header { font-size: 15.5px; }
          }
          @keyframes fadeInAnimation {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          ${css}
        `}
      </style>

      {Array.isArray(bgColor) && (
        <defs>
          <linearGradient
            id="gradient"
            gradientTransform={`rotate(${bgColor[0]})`}
            gradientUnits="userSpaceOnUse"
          >
            {bgColor.slice(1).map((color, i) => {
              const offset = (i * 100) / (bgColor.length - 2);
              return <stop key={i} offset={`${offset}%`} stop-color={color} />;
            })}
          </linearGradient>
        </defs>
      )}

      <rect
        data-testid="card-bg"
        x="0.5"
        y="0.5"
        rx={borderRadius}
        height="99%"
        stroke={borderColor}
        width={width - 1}
        fill={Array.isArray(bgColor) ? "url(#gradient)" : bgColor}
        stroke-opacity={hideBorder ? 0 : 1}
      />

      {!hideTitle && (
        <g
          data-testid="card-title"
          transform={`translate(${paddingX}, ${paddingY})`}
        >
          <text x="0" y="0" class="header" data-testid="header">
            {title}
          </text>
        </g>
      )}

      <g
        data-testid="main-card-body"
        transform={`translate(0, ${paddingY + (hideTitle ? 0 : 20)})`}
      >
        {children}
      </g>
    </svg>
  );
};
