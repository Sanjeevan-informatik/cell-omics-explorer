export function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = []; let row: string[] = [], value = '', quoted = false, closed = false;
  const field = () => {row.push(value); value = ''; closed = false;};
  const record = () => {field(); if (row.some(v => v.trim())) records.push(row); row = []; if(records.length > 10_001) throw new Error('Preview supports up to 10,000 data rows. Export a smaller subset.');};
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) { if(char==='"') {if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=char; }
    else if(char===delimiter) field();
    else if(char==='\n'||char==='\r'){if(char==='\r'&&text[i+1]==='\n')i++;record();}
    else if(char==='"' && !value && !closed) quoted=true;
    else {if(closed || char==='"')throw new Error('Malformed quoted field. Use standard CSV quoting.'); value+=char;}
  }
  if(quoted)throw new Error('Unclosed quote in the table.');
  if(value || row.length || closed)record();
  return records;
}

export const isMissing = (value: string) => !value.trim() || /^(NA|N\/A|null|NaN)$/i.test(value.trim());
