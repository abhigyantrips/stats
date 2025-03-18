import { Theme } from "@/types";
import { FC } from "hono/jsx";

interface GitHubContributionsProps {
  height: number;
  width: number;
  theme: Theme;
  title: string;
  radius: number;
  line: string;
}

export const GitHubContributions: FC<GitHubContributionsProps> = ({
  height,
  width,
  theme,
  title,
  radius,
  line,
}) => {
  return (
    <svg
      width={`${width}`}
      height={`${height}`}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        xmlns="http://www.w3.org/2000/svg"
        data-testid="card_bg"
        id="cardBg"
        x="0"
        y="0"
        rx={`${radius}`}
        height="100%"
        stroke="#E4E2E2"
        fill-opacity="1"
        width="100%"
        fill={`#${theme.backgroundColor}`}
        stroke-opacity="1"
        style={`stroke:#${theme.borderColor}; stroke-width:1;`}
      />

      <style>
        {`
          body {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
          }
          .header {
            font: 600 20px 'Segoe UI', Ubuntu, Sans-Serif;
            text-align: center;
            color: #${theme.titleColor};
            margin-top: 20px;
          }
          svg {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            user-select: none;
          }
          .ct-label {
            fill: #${theme.textColor};
            color: #${theme.textColor};
            font-size: .75rem;
            line-height: 1;
          }

          .ct-grid-background,
          .ct-line {
            fill: none;
          }

          .ct-chart-bar .ct-label,
          .ct-chart-line .ct-label {
            display: block;
            display: -webkit-box;
            display: -moz-box;
            display: -ms-flexbox;
            display: -webkit-flex;
            display: flex;
          }

          .ct-label.ct-horizontal.ct-start {
            -webkit-box-align: flex-end;
            -webkit-align-items: flex-end;
            -ms-flex-align: flex-end;
            align-items: flex-end;
            -webkit-box-pack: flex-start;
            -webkit-justify-content: flex-start;
            -ms-flex-pack: flex-start;
            justify-content: flex-start;
            text-align: left;
            text-anchor: start;
          }

          .ct-label.ct-horizontal.ct-end {
            -webkit-box-align: flex-start;
            -webkit-align-items: flex-start;
            -ms-flex-align: flex-start;
            align-items: flex-start;
            -webkit-box-pack: flex-start;
            -webkit-justify-content: flex-start;
            -ms-flex-pack: flex-start;
            justify-content: flex-start;
            text-align: left;
            text-anchor: start;
          }

          .ct-label.ct-vertical.ct-start {
            -webkit-box-align: flex-end;
            -webkit-align-items: flex-end;
            -ms-flex-align: flex-end;
            align-items: flex-end;
            -webkit-box-pack: flex-end;
            -webkit-justify-content: flex-end;
            -ms-flex-pack: flex-end;
            justify-content: flex-end;
            text-align: right;
            text-anchor: end;
          }

          .ct-label.ct-vertical.ct-end {
            -webkit-box-align: flex-end;
            -webkit-align-items: flex-end;
            -ms-flex-align: flex-end;
            align-items: flex-end;
            -webkit-box-pack: flex-start;
            -webkit-justify-content: flex-start;
            -ms-flex-pack: flex-start;
            justify-content: flex-start;
            text-align: left;
            text-anchor: start;
          }

          .ct-grid {
            stroke: #${theme.textColor};
            stroke-width: 1px;
            stroke-opacity: 0.3;
            stroke-dasharray: 2px;
          }

          .ct-point {
            stroke-width: 10px;
            stroke-linecap: round;
            stroke: #${theme.graph.pointColor};
            animation: blink 1s ease-in-out forwards;
          }

          .ct-line {
            stroke-width: 4px;
            stroke-dasharray: 5000;
            stroke-dashoffset: 5000;
            stroke: #${theme.graph.lineColor};
            animation: dash 5s ease-in-out forwards;
          }

          .ct-area {
            stroke: none;
            fill-opacity: 0.1;
          }

          .ct-series-a .ct-area,
          .ct-series-a .ct-slice-pie {
            fill: #${theme.backgroundColor};
          }

          .ct-label .ct-horizontal {
            transform: rotate(-90deg)
          }
          @keyframes blink {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>

      <foreignObject x="0" y="0" width={`${width}`} height="50">
        <h1 xmlns="http://www.w3.org/1999/xhtml" class="header">
          {title}
        </h1>
      </foreignObject>
      {line}
    </svg>
  );
};
