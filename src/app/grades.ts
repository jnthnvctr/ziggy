export interface Grade {
  id: 'K' | '1' | '2' | '3' | '4' | '5';
  short: string;
  name: string;
}

export const GRADES: readonly Grade[] = [
  { id: 'K', short: 'K', name: 'Kindergarten' },
  { id: '1', short: '1', name: 'Grade 1' },
  { id: '2', short: '2', name: 'Grade 2' },
  { id: '3', short: '3', name: 'Grade 3' },
  { id: '4', short: '4', name: 'Grade 4' },
  { id: '5', short: '5', name: 'Grade 5' },
];
