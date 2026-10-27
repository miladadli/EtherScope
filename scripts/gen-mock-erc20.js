const fs = require('fs');
const path = require('path');

const artifact = JSON.parse(
  fs.readFileSync(
    path.join('contracts', 'out', 'MockERC20.sol', 'MockERC20.json'),
    'utf8',
  ),
);

const out = `export const mockErc20Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;

export const mockErc20Bytecode = '${artifact.bytecode.object}' as \`0x\${string}\`;
`;

fs.writeFileSync(path.join('src', 'seeder', 'mock-erc20.ts'), out);
console.log('wrote mock-erc20.ts', artifact.bytecode.object.length);
