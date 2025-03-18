export interface Theme {
  name: string;
  titleColor: string;
  textColor: string;
  iconColor: string;
  backgroundColor: string;
  borderColor?: string;
  graph: {
    lineColor: string;
    pointColor: string;
    areaColor?: string;
  };
}
