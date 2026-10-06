/*
 * Monotone cubic interpolation adapted from Chartist 0.11.4
 * https://github.com/gionkunz/chartist-js/blob/v0.11.4/src/interpolation.js
 *
 * MIT License
 *
 * Copyright (c) 2013 Gion Kunz <gion.kunz@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

export function graphPath(points: { x: number; y: number }[]): string {
  const coordinate = (value: number) => Number(value.toFixed(3));
  const pair = (x: number, y: number) => `${coordinate(x)},${coordinate(y)}`;
  if (points.length === 0) return "";
  let path = `M${pair(points[0].x, points[0].y)}`;
  if (points.length < 3)
    return (
      path +
      points
        .slice(1)
        .map((point) => ` L${pair(point.x, point.y)}`)
        .join("")
    );

  const widths = points.slice(1).map((point, i) => point.x - points[i].x);
  const slopes = points
    .slice(1)
    .map((point, i) => (point.y - points[i].y) / widths[i]);
  const tangents = points.map((_point, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes.at(-1)!;
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === 0 || after === 0 || before > 0 !== after > 0) return 0;
    return (
      (3 * (widths[i - 1] + widths[i])) /
      ((2 * widths[i] + widths[i - 1]) / before +
        (widths[i] + 2 * widths[i - 1]) / after)
    );
  });
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const third = widths[i] / 3;
    path += ` C${pair(start.x + third, start.y + tangents[i] * third)} ${pair(end.x - third, end.y - tangents[i + 1] * third)} ${pair(end.x, end.y)}`;
  }
  return path;
}
