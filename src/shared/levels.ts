// Hand-authored arcade-shaped arrangements. Exact ROM layouts remain a documented fidelity gap.
export type Layout = {
  caves: [number, number, number, number][];
  enemies: [number, number, "pooka" | "fygar"][];
  rocks: [number, number][];
};
export const LEVELS: Layout[] = [
  {
    caves: [
      [1, 2, 3, 2],
      [8, 2, 10, 2],
      [1, 8, 3, 8],
      [8, 9, 10, 9],
    ],
    enemies: [
      [2, 2, "pooka"],
      [9, 2, "pooka"],
      [2, 8, "pooka"],
      [9, 9, "fygar"],
    ],
    rocks: [
      [4, 3],
      [7, 4],
      [3, 10],
    ],
  },
  {
    caves: [
      [1, 3, 3, 3],
      [8, 2, 10, 2],
      [1, 9, 3, 9],
      [8, 8, 10, 8],
    ],
    enemies: [
      [2, 3, "pooka"],
      [9, 2, "fygar"],
      [2, 9, "pooka"],
      [9, 8, "pooka"],
      [10, 8, "fygar"],
    ],
    rocks: [
      [3, 1],
      [8, 5],
      [5, 10],
    ],
  },
  {
    caves: [
      [1, 2, 3, 2],
      [8, 3, 10, 3],
      [2, 9, 4, 9],
      [8, 10, 10, 10],
    ],
    enemies: [
      [1, 2, "pooka"],
      [3, 2, "pooka"],
      [9, 3, "fygar"],
      [3, 9, "fygar"],
      [9, 10, "pooka"],
    ],
    rocks: [
      [5, 8],
      [2, 6],
      [8, 7],
    ],
  },
  {
    caves: [
      [1, 3, 1, 5],
      [9, 2, 9, 4],
      [2, 9, 4, 9],
      [7, 10, 10, 10],
    ],
    enemies: [
      [1, 3, "pooka"],
      [1, 5, "pooka"],
      [9, 3, "fygar"],
      [3, 9, "pooka"],
      [8, 10, "fygar"],
      [10, 10, "pooka"],
    ],
    rocks: [
      [3, 2],
      [7, 4],
      [5, 9],
    ],
  },
  {
    caves: [
      [2, 2, 4, 2],
      [8, 2, 10, 2],
      [1, 8, 3, 8],
      [8, 8, 8, 11],
    ],
    enemies: [
      [2, 2, "fygar"],
      [4, 2, "pooka"],
      [9, 2, "pooka"],
      [2, 8, "fygar"],
      [8, 9, "pooka"],
      [8, 11, "pooka"],
    ],
    rocks: [
      [6, 3],
      [3, 5],
      [10, 7],
    ],
  },
  {
    caves: [
      [1, 2, 1, 4],
      [8, 3, 10, 3],
      [1, 10, 4, 10],
      [8, 8, 10, 8],
    ],
    enemies: [
      [1, 2, "pooka"],
      [1, 4, "fygar"],
      [9, 3, "pooka"],
      [2, 10, "pooka"],
      [4, 10, "fygar"],
      [9, 8, "pooka"],
    ],
    rocks: [
      [3, 1],
      [6, 4],
      [7, 10],
    ],
  },
  {
    caves: [
      [2, 3, 4, 3],
      [8, 1, 8, 3],
      [1, 8, 3, 8],
      [8, 10, 10, 10],
    ],
    enemies: [
      [2, 3, "pooka"],
      [4, 3, "fygar"],
      [8, 2, "pooka"],
      [1, 8, "fygar"],
      [3, 8, "pooka"],
      [9, 10, "pooka"],
    ],
    rocks: [
      [6, 2],
      [9, 5],
      [4, 9],
    ],
  },
  {
    caves: [
      [1, 2, 3, 2],
      [8, 3, 10, 3],
      [2, 8, 2, 10],
      [8, 9, 10, 9],
    ],
    enemies: [
      [1, 2, "fygar"],
      [3, 2, "pooka"],
      [8, 3, "pooka"],
      [10, 3, "fygar"],
      [2, 9, "pooka"],
      [9, 9, "pooka"],
    ],
    rocks: [
      [6, 1],
      [4, 4],
      [7, 8],
    ],
  },
  {
    caves: [
      [2, 2, 4, 2],
      [9, 2, 9, 4],
      [1, 9, 3, 9],
      [7, 10, 10, 10],
    ],
    enemies: [
      [2, 2, "pooka"],
      [4, 2, "fygar"],
      [9, 2, "pooka"],
      [9, 4, "pooka"],
      [2, 9, "fygar"],
      [8, 10, "pooka"],
      [10, 10, "pooka"],
    ],
    rocks: [
      [6, 3],
      [3, 6],
      [8, 7],
    ],
  },
  {
    caves: [
      [1, 3, 3, 3],
      [8, 2, 10, 2],
      [1, 8, 3, 8],
      [8, 10, 10, 10],
    ],
    enemies: [
      [1, 3, "pooka"],
      [3, 3, "fygar"],
      [8, 2, "pooka"],
      [10, 2, "pooka"],
      [1, 8, "fygar"],
      [3, 8, "pooka"],
      [9, 10, "fygar"],
    ],
    rocks: [
      [4, 2],
      [7, 4],
      [5, 10],
    ],
  },
  {
    caves: [
      [2, 2, 2, 4],
      [8, 3, 10, 3],
      [1, 9, 4, 9],
      [8, 8, 8, 11],
    ],
    enemies: [
      [2, 2, "fygar"],
      [2, 4, "pooka"],
      [8, 3, "pooka"],
      [10, 3, "fygar"],
      [2, 9, "pooka"],
      [4, 9, "pooka"],
      [8, 10, "pooka"],
    ],
    rocks: [
      [6, 1],
      [4, 4],
      [10, 9],
    ],
  },
  {
    caves: [
      [1, 2, 3, 2],
      [8, 2, 10, 2],
      [1, 10, 3, 10],
      [8, 8, 10, 8],
    ],
    enemies: [
      [1, 2, "pooka"],
      [3, 2, "fygar"],
      [8, 2, "pooka"],
      [10, 2, "fygar"],
      [1, 10, "pooka"],
      [3, 10, "pooka"],
      [8, 8, "fygar"],
      [10, 8, "pooka"],
    ],
    rocks: [
      [4, 3],
      [7, 4],
      [5, 9],
    ],
  },
];
export function layoutFor(round: number): Layout {
  return LEVELS[round <= 12 ? round - 1 : 8 + ((round - 13) % 4)];
}
