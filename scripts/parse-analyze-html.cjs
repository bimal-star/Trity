const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '.next', 'analyze');

function extractChartData(html) {
  const marker = 'window.chartData = ';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  let depth = 0;
  let start = i + marker.length;
  const s = html.slice(start);
  if (s[0] !== '[') return null;
  for (let j = 0; j < s.length; j++) {
    const c = s[j];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        return JSON.parse(s.slice(0, j + 1));
      }
    }
  }
  return null;
}

function walk(g, prefix, hits, re) {
  if (!g) return;
  const label = g.label || '';
  const p = `${prefix}/${label}`.replace(/^\//, '');
  if (re.test(label)) hits.push({ path: p, parsedSize: g.parsedSize, statSize: g.statSize });
  for (const c of g.groups || []) walk(c, p, hits, re);
}

const re = /papaparse|mappingTable|middleware|openai|tr46/i;

for (const name of ['nodejs', 'client', 'edge']) {
  const fp = path.join(root, `${name}.html`);
  if (!fs.existsSync(fp)) {
    console.log(name, 'MISSING');
    continue;
  }
  const html = fs.readFileSync(fp, 'utf8');
  const data = extractChartData(html);
  if (!data || !data.length) {
    console.log(name, 'empty or no chartData');
    continue;
  }
  const hits = [];
  for (const d of data) walk(d, '', hits, re);
  console.log(`\n## ${name}`);
  if (!hits.length) console.log('(no matching labels)');
  else hits.forEach((h) => console.log(JSON.stringify(h)));
}
