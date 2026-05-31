export interface FplElement {
  id: number;
  web_name: string;
  photo: string;
  element_type: number;
}

export type FplElementMap = Record<number, FplElement>;
